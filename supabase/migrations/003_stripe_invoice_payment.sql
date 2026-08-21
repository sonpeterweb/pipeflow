ALTER TABLE public.invoices
ADD COLUMN stripe_checkout_session_id text,
ADD COLUMN stripe_payment_intent_id text;

CREATE UNIQUE INDEX invoices_stripe_checkout_session_unique_idx
ON public.invoices (stripe_checkout_session_id)
WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX invoices_stripe_payment_intent_unique_idx
ON public.invoices (stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.attach_invoice_checkout_session(
  p_invoice_id uuid,
  p_expected_session_id text,
  p_new_session_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_session_id text;
  v_status text;
  v_amount numeric(10, 2);
BEGIN
  IF v_user_id IS NULL OR p_new_session_id !~ '^cs_test_' THEN
    RETURN false;
  END IF;

  SELECT
    invoices.stripe_checkout_session_id,
    invoices.status,
    invoices.amount
  INTO
    v_current_session_id,
    v_status,
    v_amount
  FROM public.invoices
  WHERE invoices.id = p_invoice_id
    AND invoices.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_status NOT IN ('sent', 'overdue')
    OR v_amount < 0.50
    OR v_amount > 999999.99
  THEN
    RETURN false;
  END IF;

  IF v_current_session_id = p_new_session_id THEN
    RETURN true;
  END IF;

  IF v_current_session_id IS DISTINCT FROM p_expected_session_id THEN
    RETURN false;
  END IF;

  UPDATE public.invoices
  SET stripe_checkout_session_id = p_new_session_id
  WHERE invoices.id = p_invoice_id
    AND invoices.user_id = v_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_invoice_checkout_session(uuid, text, text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.attach_invoice_checkout_session(uuid, text, text)
TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_invoice_payment_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role')
    AND (
      NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
      OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
    )
  THEN
    RAISE EXCEPTION 'Invoice payment references are server managed.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_invoice_payment_references
BEFORE UPDATE OF stripe_checkout_session_id, stripe_payment_intent_id
ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.protect_invoice_payment_references();
