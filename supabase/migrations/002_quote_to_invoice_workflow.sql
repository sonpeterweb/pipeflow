ALTER TABLE public.invoices
ADD COLUMN quote_id uuid REFERENCES public.quotes (id) ON DELETE SET NULL;

CREATE INDEX invoices_quote_id_idx
ON public.invoices (quote_id);

CREATE UNIQUE INDEX invoices_user_quote_unique_idx
ON public.invoices (user_id, quote_id)
WHERE quote_id IS NOT NULL;

CREATE UNIQUE INDEX invoices_user_invoice_number_unique_idx
ON public.invoices (user_id, invoice_number)
WHERE invoice_number IS NOT NULL;

DROP POLICY "Users can insert their own invoices" ON public.invoices;

CREATE POLICY "Users can insert their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    customer_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.customers
      WHERE customers.id = invoices.customer_id
        AND customers.user_id = auth.uid()
    )
  )
  AND (
    job_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = invoices.job_id
        AND jobs.user_id = auth.uid()
    )
  )
  AND (
    quote_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.quotes
      WHERE quotes.id = invoices.quote_id
        AND quotes.user_id = auth.uid()
        AND quotes.status = 'accepted'
    )
  )
);

DROP POLICY "Users can update their own invoices" ON public.invoices;

CREATE POLICY "Users can update their own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND (
    customer_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.customers
      WHERE customers.id = invoices.customer_id
        AND customers.user_id = auth.uid()
    )
  )
  AND (
    job_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.jobs
      WHERE jobs.id = invoices.job_id
        AND jobs.user_id = auth.uid()
    )
  )
  AND (
    quote_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.quotes
      WHERE quotes.id = invoices.quote_id
        AND quotes.user_id = auth.uid()
        AND quotes.status = 'accepted'
    )
  )
);

CREATE OR REPLACE FUNCTION public.prevent_invoiced_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'accepted'
    AND NEW.status <> 'accepted'
    AND EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE invoices.quote_id = OLD.id
        AND invoices.user_id = OLD.user_id
    )
  THEN
    RAISE EXCEPTION 'An invoiced quote must remain accepted.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_invoiced_quote_status_change
BEFORE UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_invoiced_quote_status_change();

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(
  p_quote_id uuid,
  p_issued_at timestamptz,
  p_due_at timestamptz
)
RETURNS TABLE (
  outcome text,
  invoice_id uuid,
  created_invoice_number text
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_customer_id uuid;
  v_job_id uuid;
  v_amount numeric(10, 2);
  v_quote_status text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_next_number bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT 'unauthenticated'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 24));

  SELECT
    quotes.customer_id,
    quotes.job_id,
    quotes.amount,
    quotes.status
  INTO
    v_customer_id,
    v_job_id,
    v_amount,
    v_quote_status
  FROM public.quotes
  WHERE quotes.id = p_quote_id
    AND quotes.user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF v_quote_status <> 'accepted' THEN
    RETURN QUERY SELECT 'ineligible'::text, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  SELECT invoices.id, invoices.invoice_number
  INTO v_invoice_id, v_invoice_number
  FROM public.invoices
  WHERE invoices.user_id = v_user_id
    AND invoices.quote_id = p_quote_id;

  IF FOUND THEN
    RETURN QUERY SELECT 'duplicate'::text, v_invoice_id, v_invoice_number;
    RETURN;
  END IF;

  LOOP
    SELECT GREATEST(
      COALESCE(
        MAX(substring(invoices.invoice_number FROM '^INV-([0-9]+)$')::bigint),
        1000
      ) + 1,
      1001
    )
    INTO v_next_number
    FROM public.invoices
    WHERE invoices.user_id = v_user_id
      AND invoices.invoice_number ~ '^INV-[0-9]+$';

    v_invoice_number := 'INV-' || CASE
      WHEN v_next_number < 10000 THEN lpad(v_next_number::text, 4, '0')
      ELSE v_next_number::text
    END;

    BEGIN
      INSERT INTO public.invoices (
        user_id,
        quote_id,
        customer_id,
        job_id,
        invoice_number,
        amount,
        status,
        issued_at,
        due_at,
        paid_at
      )
      VALUES (
        v_user_id,
        p_quote_id,
        v_customer_id,
        v_job_id,
        v_invoice_number,
        v_amount,
        'draft',
        p_issued_at,
        p_due_at,
        NULL
      )
      RETURNING invoices.id, invoices.invoice_number
      INTO v_invoice_id, v_invoice_number;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT invoices.id, invoices.invoice_number
        INTO v_invoice_id, v_invoice_number
        FROM public.invoices
        WHERE invoices.user_id = v_user_id
          AND invoices.quote_id = p_quote_id;

        IF FOUND THEN
          RETURN QUERY SELECT 'duplicate'::text, v_invoice_id, v_invoice_number;
          RETURN;
        END IF;

        CONTINUE;
    END;

    RETURN QUERY SELECT 'created'::text, v_invoice_id, v_invoice_number;
    RETURN;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_quote_to_invoice(uuid, timestamptz, timestamptz)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, timestamptz, timestamptz)
TO authenticated;
