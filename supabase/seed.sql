-- PipeFlow realistic demo/dev seed data.
--
-- This file is intentionally for local/demo use only.
-- Do not run it against production data.
--
-- Demo company context:
-- Harbour Plumbing Ltd
-- hello@harbourplumbing.co.nz
-- 09 884 2176
-- https://harbourplumbing.co.nz
-- 18 Halsey Street, Wynyard Quarter, Auckland 1010
--
-- Before running:
-- 1. Create a demo user through the app signup flow using:
--    demo@pipeflow.app
-- 2. Run this file from top to bottom in Supabase SQL Editor.
--
-- Reset/reseed strategy:
-- Rerunning this file deletes only the fixed demo UUID ranges, then recreates
-- deterministic demo records. It does not clear other records for the demo user.

do $$
declare
  demo_user_email text := 'demo@pipeflow.app';
  demo_user_id uuid := '742b9691-c4d1-48c1-82e7-12e07b752190';
  anchor_date timestamptz := '2026-07-09 09:00:00+12';
begin
  select id
  into demo_user_id
  from auth.users
  where lower(email) = demo_user_email
  order by created_at desc
  limit 1;

  if demo_user_id is null then
    raise exception 'No auth.users row found for %. Create that demo user before running supabase/seed.sql.', demo_user_email;
  end if;

  insert into public.profiles (id, email, full_name, company_name)
  select demo_user_id, email, 'Sarah McKenzie', 'Harbour Plumbing Ltd'
  from auth.users
  where id = demo_user_id
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    company_name = excluded.company_name;

  delete from public.invoices
  where user_id = demo_user_id
    and id::text like '40000000-0000-0000-0000-0000000000%';

  delete from public.quotes
  where user_id = demo_user_id
    and id::text like '30000000-0000-0000-0000-0000000000%';

  delete from public.jobs
  where user_id = demo_user_id
    and id::text like '20000000-0000-0000-0000-0000000000%';

  delete from public.customers
  where user_id = demo_user_id
    and id::text like '10000000-0000-0000-0000-0000000000%';

  insert into public.customers (
    id,
    user_id,
    name,
    company_name,
    email,
    phone,
    address,
    notes,
    created_at
  )
  values
    ('10000000-0000-0000-0000-000000000001', demo_user_id, 'Amelia Fraser', null, 'amelia.fraser@xtra.co.nz', '021 742 118', '42 Valley Road, Mt Eden, Auckland 1024', 'Older villa with mixed copper and PEX pipework. Text before arrival if access time changes.', anchor_date - interval '104 days'),
    ('10000000-0000-0000-0000-000000000002', demo_user_id, 'James Whitaker', null, 'james.whitaker@icloud.com', '027 391 6652', '18 Summer Street, Ponsonby, Auckland 1011', 'Renovating the kitchen first, ensuite later. Wants clear stage-by-stage pricing.', anchor_date - interval '97 days'),
    ('10000000-0000-0000-0000-000000000003', demo_user_id, 'Mereana Thompson', null, 'mereana.thompson@gmail.com', '021 508 443', '77 Lake Road, Takapuna, Auckland 0622', 'Family home close to the coast; check external fittings for corrosion during visits.', anchor_date - interval '91 days'),
    ('10000000-0000-0000-0000-000000000004', demo_user_id, 'Oliver Singh', null, 'oliver.singh@outlook.co.nz', '021 884 305', '9 Rathgar Road, Henderson, Auckland 0610', 'Rental owner. Include property address and tenant access notes on invoices.', anchor_date - interval '88 days'),
    ('10000000-0000-0000-0000-000000000005', demo_user_id, 'Hannah Liu', null, 'hannah.liu@gmail.com', '022 165 7789', '31 Kinross Street, New Lynn, Auckland 0600', 'Prefers photos before walls or cabinets are closed up.', anchor_date - interval '83 days'),
    ('10000000-0000-0000-0000-000000000006', demo_user_id, 'Daniel Roberts', null, 'dan.roberts@icloud.com', '021 692 014', '15 Millhouse Drive, Howick, Auckland 2014', 'Two-storey home with previous pressure issues upstairs.', anchor_date - interval '79 days'),
    ('10000000-0000-0000-0000-000000000007', demo_user_id, 'Priya Nair', null, 'priya.nair@outlook.com', '021 733 519', '56 Chapel Road, Botany, Auckland 2016', 'Usually available after 3pm. Young child at home, so keep noisy work to short windows where possible.', anchor_date - interval '75 days'),
    ('10000000-0000-0000-0000-000000000008', demo_user_id, 'Grace Campbell', null, 'grace.campbell@xtra.co.nz', '027 640 2121', '22 Coronation Road, Hillcrest, Auckland 0627', 'Planning a bathroom upgrade later this year; useful to flag ageing valves during callouts.', anchor_date - interval '70 days'),
    ('10000000-0000-0000-0000-000000000009', demo_user_id, 'Auckland Property Partners', 'Auckland Property Partners Ltd', 'maintenance@appartners.co.nz', '09 303 8142', 'Level 3, 125 Queen Street, Auckland 1010', 'Property manager with multiple CBD apartments. Requires purchase order on invoices.', anchor_date - interval '67 days'),
    ('10000000-0000-0000-0000-000000000010', demo_user_id, 'Harbour View Apartments Body Corporate', 'Harbour View Apartments BC', 'committee@harbourviewbc.co.nz', '09 489 2207', '6 Byron Avenue, Takapuna, Auckland 0622', 'Body corporate contact. Site access via building manager between 8am and 4pm.', anchor_date - interval '63 days'),
    ('10000000-0000-0000-0000-000000000011', demo_user_id, 'Kauri Property Management', 'Kauri Property Management Ltd', 'repairs@kauripm.co.nz', '09 836 4581', '4 Trading Place, Henderson, Auckland 0612', 'High-volume rental maintenance client. Prefers weekly invoice batch.', anchor_date - interval '58 days'),
    ('10000000-0000-0000-0000-000000000012', demo_user_id, 'Northbridge Early Learning', 'Northbridge Early Learning Centre', 'office@northbridgeearlylearning.co.nz', '09 415 2290', '28 Oteha Valley Road, Albany, Auckland 0632', 'Childcare site. Avoid drop-off and pickup times unless urgent.', anchor_date - interval '54 days'),
    ('10000000-0000-0000-0000-000000000013', demo_user_id, 'Westgate Medical Suites', 'Westgate Medical Suites Ltd', 'admin@westgatemedical.co.nz', '09 832 7054', '19 Fernhill Drive, Massey, Auckland 0614', 'Commercial tenancy. Requires tidy handover notes and minimal disruption.', anchor_date - interval '49 days'),
    ('10000000-0000-0000-0000-000000000014', demo_user_id, 'Coastal Kitchen Group', 'Coastal Kitchen Group Ltd', 'ops@coastalkitchens.co.nz', '09 377 8944', '88 Jervois Road, Herne Bay, Auckland 1011', 'Hospitality client. Grease trap and kitchen drainage recurring work.', anchor_date - interval '46 days'),
    ('10000000-0000-0000-0000-000000000015', demo_user_id, 'Summit Build Co', 'Summit Build Co Ltd', 'site@summitbuildco.co.nz', '027 441 8700', '21 Huron Street, Takapuna, Auckland 0622', 'Small construction firm. Works are usually priced by stage and signed off by site supervisor.', anchor_date - interval '42 days'),
    ('10000000-0000-0000-0000-000000000016', demo_user_id, 'Fern & Co Interiors', 'Fern & Co Interiors Ltd', 'projects@ferncointeriors.co.nz', '021 904 772', '14 Williamson Avenue, Grey Lynn, Auckland 1021', 'Interior renovation partner for bathrooms and laundries. Confirm tile dates before booking fit-off.', anchor_date - interval '38 days'),
    ('10000000-0000-0000-0000-000000000017', demo_user_id, 'Rangitoto Retail Centre', 'Rangitoto Retail Centre', 'facilities@rangitotoretail.co.nz', '09 444 6721', '219 Don McKinnon Drive, Albany, Auckland 0632', 'Retail facilities manager. Access cards held by centre security.', anchor_date - interval '33 days'),
    ('10000000-0000-0000-0000-000000000018', demo_user_id, 'Pohutukawa Villas Body Corporate', 'Pohutukawa Villas BC', 'chair@pohutukawavillas.co.nz', '021 557 903', '3 Selwyn Road, Howick, Auckland 2014', 'Body corporate for 12 villas. Shared stormwater and external hose taps.', anchor_date - interval '28 days'),
    ('10000000-0000-0000-0000-000000000019', demo_user_id, 'New Lynn Bakery', 'New Lynn Bakery Ltd', 'owner@newlynnbakery.co.nz', '09 827 3188', '3058 Great North Road, New Lynn, Auckland 0600', 'Small commercial kitchen. Early morning access available before trading.', anchor_date - interval '22 days'),
    ('10000000-0000-0000-0000-000000000020', demo_user_id, 'Pacific Heights Developments', 'Pacific Heights Developments Ltd', 'accounts@pacificheightsdev.co.nz', '09 520 6120', '10 Te Irirangi Drive, Botany, Auckland 2013', 'Townhouse developer. Variations must be approved by email before extra work starts.', anchor_date - interval '17 days');

  insert into public.jobs (
    id,
    user_id,
    customer_id,
    title,
    description,
    address,
    status,
    priority,
    estimated_amount,
    scheduled_date,
    created_at
  )
  values
    ('20000000-0000-0000-0000-000000000001', demo_user_id, '10000000-0000-0000-0000-000000000001', 'Blocked Kitchen Gully', 'Kitchen gully overflows after heavy rain. Booked for a drain machine clear and camera check if roots are present.', '42 Valley Road, Mt Eden, Auckland 1024', 'scheduled', 'high', 620.00, anchor_date + interval '1 day 8 hours', anchor_date - interval '10 days'),
    ('20000000-0000-0000-0000-000000000002', demo_user_id, '10000000-0000-0000-0000-000000000002', 'Kitchen Renovation Plumbing', 'Rough-in sink, dishwasher, fridge water line, and waste before cabinetry install.', '18 Summer Street, Ponsonby, Auckland 1011', 'in_progress', 'medium', 2450.00, anchor_date + interval '2 hours', anchor_date - interval '25 days'),
    ('20000000-0000-0000-0000-000000000003', demo_user_id, '10000000-0000-0000-0000-000000000003', 'Upstairs Water Pressure Issue', 'Pressure test completed. Upstairs shower is still dropping when laundry taps are running; check tempering valve and restrictors.', '77 Lake Road, Takapuna, Auckland 0622', 'completed', 'medium', 385.00, anchor_date - interval '9 days', anchor_date - interval '30 days'),
    ('20000000-0000-0000-0000-000000000004', demo_user_id, '10000000-0000-0000-0000-000000000004', 'Burst Pipe Under Laundry', 'Emergency repair to split supply line under laundry tub. Tenant confirmed water back on before 6pm.', '9 Rathgar Road, Henderson, Auckland 0610', 'paid', 'urgent', 890.00, anchor_date - interval '18 days', anchor_date - interval '20 days'),
    ('20000000-0000-0000-0000-000000000005', demo_user_id, '10000000-0000-0000-0000-000000000005', 'Toilet Suite Replacement', 'Replace cracked cistern, pan connector, and isolation valve in family bathroom.', '31 Kinross Street, New Lynn, Auckland 0600', 'completed', 'medium', 740.00, anchor_date - interval '14 days', anchor_date - interval '22 days'),
    ('20000000-0000-0000-0000-000000000006', demo_user_id, '10000000-0000-0000-0000-000000000006', 'Hot Water Cylinder Fault', 'No hot water from existing cylinder. Element tested faulty; valve kit on order from supplier.', '15 Millhouse Drive, Howick, Auckland 2014', 'in_progress', 'high', 520.00, anchor_date, anchor_date - interval '7 days'),
    ('20000000-0000-0000-0000-000000000007', demo_user_id, '10000000-0000-0000-0000-000000000007', 'Bathroom Fit-Off', 'Fit vanity mixer, shower mixer trim, toilet, and shower waste once tiler has finished.', '56 Chapel Road, Botany, Auckland 2016', 'scheduled', 'medium', 980.00, anchor_date + interval '5 days', anchor_date - interval '13 days'),
    ('20000000-0000-0000-0000-000000000008', demo_user_id, '10000000-0000-0000-0000-000000000008', 'Vent Pipe Roof Leak Check', 'Check staining around ceiling below vent pipe. Likely flashing issue after last storm.', '22 Coronation Road, Hillcrest, Auckland 0627', 'lead', 'medium', 460.00, anchor_date + interval '7 days', anchor_date - interval '3 days'),
    ('20000000-0000-0000-0000-000000000009', demo_user_id, '10000000-0000-0000-0000-000000000009', 'Apartment Ceiling Leak Trace', 'Unit 5B has staining below bathroom stack. Building manager has approved access to unit 6B above.', '125 Queen Street, Auckland 1010', 'in_progress', 'urgent', 720.00, anchor_date + interval '3 hours', anchor_date - interval '4 days'),
    ('20000000-0000-0000-0000-000000000010', demo_user_id, '10000000-0000-0000-0000-000000000010', 'Shared Stormwater CCTV Inspection', 'CCTV shared stormwater line after courtyard flooding. Send photos and footage summary to committee.', '6 Byron Avenue, Takapuna, Auckland 0622', 'quoted', 'high', 1450.00, anchor_date + interval '6 days', anchor_date - interval '8 days'),
    ('20000000-0000-0000-0000-000000000011', demo_user_id, '10000000-0000-0000-0000-000000000011', 'Rental Shower Mixer Cartridge', 'Tenant reports shower running hot and cold. Replace mixer cartridge and test temperature.', '14 Edmonton Road, Henderson, Auckland 0612', 'completed', 'medium', 365.00, anchor_date - interval '21 days', anchor_date - interval '26 days'),
    ('20000000-0000-0000-0000-000000000012', demo_user_id, '10000000-0000-0000-0000-000000000012', 'Drinking Fountain Service', 'Service two drinking fountains and complete backflow check before centre opens.', '28 Oteha Valley Road, Albany, Auckland 0632', 'scheduled', 'low', 540.00, anchor_date + interval '8 days', anchor_date - interval '6 days'),
    ('20000000-0000-0000-0000-000000000013', demo_user_id, '10000000-0000-0000-0000-000000000013', 'Treatment Room Basin Leak', 'Repair leaking trap under treatment room basin and disinfect work area before handover.', '19 Fernhill Drive, Massey, Auckland 0614', 'completed', 'high', 420.00, anchor_date - interval '11 days', anchor_date - interval '17 days'),
    ('20000000-0000-0000-0000-000000000014', demo_user_id, '10000000-0000-0000-0000-000000000014', 'Commercial Kitchen Drainage', 'Kitchen line draining slowly before lunch service. Clear line and check grease trap condition.', '88 Jervois Road, Herne Bay, Auckland 1011', 'in_progress', 'high', 1180.00, anchor_date + interval '1 day 2 hours', anchor_date - interval '5 days'),
    ('20000000-0000-0000-0000-000000000015', demo_user_id, '10000000-0000-0000-0000-000000000015', 'Townhouse Rough-In Stage 1', 'First-fix plumbing for two townhouses, including bathroom groups, laundries, and kitchen supplies.', '21 Huron Street, Takapuna, Auckland 0622', 'completed', 'medium', 7200.00, anchor_date - interval '32 days', anchor_date - interval '44 days'),
    ('20000000-0000-0000-0000-000000000016', demo_user_id, '10000000-0000-0000-0000-000000000016', 'Laundry Renovation Plumbing', 'Relocate laundry waste and supplies so joiner can install stacked washer/dryer cabinet.', '14 Williamson Avenue, Grey Lynn, Auckland 1021', 'quoted', 'medium', 1750.00, anchor_date + interval '10 days', anchor_date - interval '9 days'),
    ('20000000-0000-0000-0000-000000000017', demo_user_id, '10000000-0000-0000-0000-000000000017', 'Retail Toilet Block Repairs', 'Replace two flush valves and one leaking isolation valve in public toilet block.', '219 Don McKinnon Drive, Albany, Auckland 0632', 'scheduled', 'high', 960.00, anchor_date + interval '4 days', anchor_date - interval '7 days'),
    ('20000000-0000-0000-0000-000000000018', demo_user_id, '10000000-0000-0000-0000-000000000018', 'Shared Outdoor Tap Replacement', 'Replace four corroded outdoor taps across common garden areas.', '3 Selwyn Road, Howick, Auckland 2014', 'completed', 'low', 680.00, anchor_date - interval '24 days', anchor_date - interval '31 days'),
    ('20000000-0000-0000-0000-000000000019', demo_user_id, '10000000-0000-0000-0000-000000000019', 'Bakery Sink Waste Repair', 'Repair leaking sink waste before morning production. Early access arranged with owner.', '3058 Great North Road, New Lynn, Auckland 0600', 'paid', 'urgent', 575.00, anchor_date - interval '16 days', anchor_date - interval '18 days'),
    ('20000000-0000-0000-0000-000000000020', demo_user_id, '10000000-0000-0000-0000-000000000020', 'Townhouse Drainage Plan Review', 'Review as-built drainage plan and price stage two changes before slab sign-off.', '10 Te Irirangi Drive, Botany, Auckland 2013', 'lead', 'medium', 1320.00, anchor_date + interval '13 days', anchor_date - interval '2 days'),
    ('20000000-0000-0000-0000-000000000021', demo_user_id, '10000000-0000-0000-0000-000000000001', 'Mains Pressure Cylinder Install', 'Install 180L mains pressure cylinder, tempering valve, tray, and drain line.', '42 Valley Road, Mt Eden, Auckland 1024', 'completed', 'high', 2850.00, anchor_date - interval '42 days', anchor_date - interval '55 days'),
    ('20000000-0000-0000-0000-000000000022', demo_user_id, '10000000-0000-0000-0000-000000000002', 'Ensuite Fit-Off', 'Fit shower mixer, basin waste, toilet, and silicone penetrations after waterproofing sign-off.', '18 Summer Street, Ponsonby, Auckland 1011', 'scheduled', 'medium', 1680.00, anchor_date + interval '11 days', anchor_date - interval '11 days'),
    ('20000000-0000-0000-0000-000000000023', demo_user_id, '10000000-0000-0000-0000-000000000003', 'Kitchen Mixer Replacement', 'Replace leaking pull-out kitchen mixer and check under-bench isolation valves.', '77 Lake Road, Takapuna, Auckland 0622', 'paid', 'low', 295.00, anchor_date - interval '51 days', anchor_date - interval '58 days'),
    ('20000000-0000-0000-0000-000000000024', demo_user_id, '10000000-0000-0000-0000-000000000004', 'Rental Hot Water Callout', 'Tenant has intermittent hot water. Supplier is confirming availability for replacement valve kit.', '9 Rathgar Road, Henderson, Auckland 0610', 'in_progress', 'high', 640.00, anchor_date + interval '2 days', anchor_date - interval '6 days'),
    ('20000000-0000-0000-0000-000000000025', demo_user_id, '10000000-0000-0000-0000-000000000005', 'Water Hammer Investigation', 'Customer cancelled after appliance technician found the washing machine solenoid was the cause.', '31 Kinross Street, New Lynn, Auckland 0600', 'cancelled', 'low', 260.00, anchor_date - interval '6 days', anchor_date - interval '8 days'),
    ('20000000-0000-0000-0000-000000000026', demo_user_id, '10000000-0000-0000-0000-000000000006', 'Vanity Waste Leak', 'Reseat vanity trap, replace seal, and test with basin full drain-down.', '15 Millhouse Drive, Howick, Auckland 2014', 'completed', 'medium', 330.00, anchor_date - interval '28 days', anchor_date - interval '34 days'),
    ('20000000-0000-0000-0000-000000000027', demo_user_id, '10000000-0000-0000-0000-000000000007', 'Dishwasher Connection', 'Connect dishwasher inlet, waste spigot, and isolation valve after kitchen delivery.', '56 Chapel Road, Botany, Auckland 2016', 'completed', 'low', 410.00, anchor_date - interval '37 days', anchor_date - interval '43 days'),
    ('20000000-0000-0000-0000-000000000028', demo_user_id, '10000000-0000-0000-0000-000000000008', 'Channel Drain Clean-Out', 'Clear leaves and silt from driveway channel drain and flush to boundary sump.', '22 Coronation Road, Hillcrest, Auckland 0627', 'paid', 'medium', 510.00, anchor_date - interval '45 days', anchor_date - interval '49 days'),
    ('20000000-0000-0000-0000-000000000029', demo_user_id, '10000000-0000-0000-0000-000000000009', 'Apartment Toilet Replacement', 'Replace cracked toilet pan in unit 7C. Coordinate lift access with building manager.', '125 Queen Street, Auckland 1010', 'completed', 'medium', 820.00, anchor_date - interval '61 days', anchor_date - interval '68 days'),
    ('20000000-0000-0000-0000-000000000030', demo_user_id, '10000000-0000-0000-0000-000000000010', 'Pump Room Leak Repair', 'Repair leaking union in pump room and complete pressure test before body corporate meeting.', '6 Byron Avenue, Takapuna, Auckland 0622', 'completed', 'high', 1120.00, anchor_date - interval '19 days', anchor_date - interval '27 days'),
    ('20000000-0000-0000-0000-000000000031', demo_user_id, '10000000-0000-0000-0000-000000000011', 'Tenant Blocked Kitchen Sink', 'Kitchen sink blocked at rental. Clear trap, test downstream line, and send photos to property manager.', '43 Swanson Road, Henderson, Auckland 0610', 'scheduled', 'medium', 345.00, anchor_date + interval '3 days', anchor_date - interval '1 day'),
    ('20000000-0000-0000-0000-000000000032', demo_user_id, '10000000-0000-0000-0000-000000000012', 'Staff Room Zip Tap Fault', 'Boiling water unit tripping after reset. Diagnose whether repair or replacement is better value.', '28 Oteha Valley Road, Albany, Auckland 0632', 'lead', 'low', 390.00, anchor_date + interval '9 days', anchor_date - interval '1 day'),
    ('20000000-0000-0000-0000-000000000033', demo_user_id, '10000000-0000-0000-0000-000000000013', 'Annual Backflow Test', 'Complete annual backflow test and email compliance certificate to medical suite manager.', '19 Fernhill Drive, Massey, Auckland 0614', 'completed', 'medium', 450.00, anchor_date - interval '7 days', anchor_date - interval '15 days'),
    ('20000000-0000-0000-0000-000000000034', demo_user_id, '10000000-0000-0000-0000-000000000014', 'Commercial Dishwasher Connection', 'Connect replacement commercial dishwasher and test drainage before evening service.', '88 Jervois Road, Herne Bay, Auckland 1011', 'quoted', 'medium', 760.00, anchor_date + interval '12 days', anchor_date - interval '4 days'),
    ('20000000-0000-0000-0000-000000000035', demo_user_id, '10000000-0000-0000-0000-000000000015', 'Townhouse Fit-Off Stage 2', 'Fit off fixtures for first townhouse handover, including two bathrooms, laundry, and kitchen.', '21 Huron Street, Takapuna, Auckland 0622', 'in_progress', 'high', 6400.00, anchor_date + interval '1 day', anchor_date - interval '12 days'),
    ('20000000-0000-0000-0000-000000000036', demo_user_id, '10000000-0000-0000-0000-000000000016', 'Bathroom Renovation Quote Visit', 'Measure existing bathroom, confirm wall-hung vanity position, and price plumbing relocation.', '14 Williamson Avenue, Grey Lynn, Auckland 1021', 'quoted', 'medium', 2100.00, anchor_date + interval '5 days', anchor_date - interval '6 days'),
    ('20000000-0000-0000-0000-000000000037', demo_user_id, '10000000-0000-0000-0000-000000000017', 'Retail Tenancy Sink Leak', 'Water visible under rear sink cabinet in tenancy 4. Access through centre security before trading.', '219 Don McKinnon Drive, Albany, Auckland 0632', 'scheduled', 'urgent', 690.00, anchor_date + interval '1 day 5 hours', anchor_date - interval '2 days'),
    ('20000000-0000-0000-0000-000000000038', demo_user_id, '10000000-0000-0000-0000-000000000018', 'Shared Stormwater Remediation Quote', 'Quote options for slow shared stormwater drain affecting three villas after heavy rain.', '3 Selwyn Road, Howick, Auckland 2014', 'quoted', 'high', 2350.00, anchor_date + interval '14 days', anchor_date - interval '5 days'),
    ('20000000-0000-0000-0000-000000000039', demo_user_id, '10000000-0000-0000-0000-000000000019', 'Bakery Urinal Flush Pipe', 'Repair leaking flush pipe in customer toilet and leave area ready before lunchtime trade.', '3058 Great North Road, New Lynn, Auckland 0600', 'completed', 'medium', 390.00, anchor_date - interval '3 days', anchor_date - interval '10 days'),
    ('20000000-0000-0000-0000-000000000040', demo_user_id, '10000000-0000-0000-0000-000000000020', 'Townhouse Variation Review', 'Cancelled after developer changed the bathroom layout and paused stage three.', '10 Te Irirangi Drive, Botany, Auckland 2013', 'cancelled', 'low', 950.00, anchor_date - interval '2 days', anchor_date - interval '12 days');

  insert into public.quotes (
    id,
    user_id,
    customer_id,
    job_id,
    quote_number,
    amount,
    status,
    issued_at,
    accepted_at,
    created_at
  )
  values
    ('30000000-0000-0000-0000-000000000001', demo_user_id, '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000010', 'Q-1042', 1450.00, 'sent', anchor_date - interval '6 days', null, anchor_date - interval '7 days'),
    ('30000000-0000-0000-0000-000000000002', demo_user_id, '10000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000016', 'Q-1043', 1750.00, 'sent', anchor_date - interval '4 days', null, anchor_date - interval '6 days'),
    ('30000000-0000-0000-0000-000000000003', demo_user_id, '10000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000020', 'Q-1044', 1320.00, 'draft', null, null, anchor_date - interval '2 days'),
    ('30000000-0000-0000-0000-000000000004', demo_user_id, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Q-1045', 2450.00, 'accepted', anchor_date - interval '20 days', anchor_date - interval '18 days', anchor_date - interval '21 days'),
    ('30000000-0000-0000-0000-000000000005', demo_user_id, '10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', 'Q-1046', 7200.00, 'accepted', anchor_date - interval '50 days', anchor_date - interval '48 days', anchor_date - interval '52 days'),
    ('30000000-0000-0000-0000-000000000006', demo_user_id, '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000038', 'Q-1047', 2350.00, 'sent', anchor_date - interval '2 days', null, anchor_date - interval '3 days'),
    ('30000000-0000-0000-0000-000000000007', demo_user_id, '10000000-0000-0000-0000-000000000014', null, 'Q-1048', 680.00, 'draft', null, null, anchor_date - interval '1 day'),
    ('30000000-0000-0000-0000-000000000008', demo_user_id, '10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000034', 'Q-1049', 760.00, 'sent', anchor_date - interval '1 day', null, anchor_date - interval '2 days'),
    ('30000000-0000-0000-0000-000000000009', demo_user_id, '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'Q-1050', 520.00, 'accepted', anchor_date - interval '7 days', anchor_date - interval '6 days', anchor_date - interval '8 days'),
    ('30000000-0000-0000-0000-000000000010', demo_user_id, '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000008', 'Q-1051', 460.00, 'draft', null, null, anchor_date - interval '3 days'),
    ('30000000-0000-0000-0000-000000000011', demo_user_id, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021', 'Q-1052', 2850.00, 'accepted', anchor_date - interval '59 days', anchor_date - interval '57 days', anchor_date - interval '61 days'),
    ('30000000-0000-0000-0000-000000000012', demo_user_id, '10000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000040', 'Q-1053', 950.00, 'declined', anchor_date - interval '11 days', null, anchor_date - interval '12 days'),
    ('30000000-0000-0000-0000-000000000013', demo_user_id, '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000037', 'Q-1054', 690.00, 'accepted', anchor_date - interval '2 days', anchor_date - interval '1 day', anchor_date - interval '3 days'),
    ('30000000-0000-0000-0000-000000000014', demo_user_id, '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000032', 'Q-1055', 390.00, 'draft', null, null, anchor_date - interval '1 day'),
    ('30000000-0000-0000-0000-000000000015', demo_user_id, '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000029', 'Q-1056', 820.00, 'accepted', anchor_date - interval '70 days', anchor_date - interval '68 days', anchor_date - interval '71 days');

  insert into public.invoices (
    id,
    user_id,
    customer_id,
    job_id,
    invoice_number,
    amount,
    status,
    issued_at,
    due_at,
    paid_at,
    created_at
  )
  values
    ('40000000-0000-0000-0000-000000000001', demo_user_id, '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'INV-1024', 890.00, 'paid', anchor_date - interval '17 days', anchor_date - interval '3 days', anchor_date - interval '5 days', anchor_date - interval '17 days'),
    ('40000000-0000-0000-0000-000000000002', demo_user_id, '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'INV-1025', 740.00, 'paid', anchor_date - interval '13 days', anchor_date + interval '1 day', anchor_date - interval '4 days', anchor_date - interval '13 days'),
    ('40000000-0000-0000-0000-000000000003', demo_user_id, '10000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011', 'INV-1026', 365.00, 'paid', anchor_date - interval '20 days', anchor_date - interval '6 days', anchor_date - interval '8 days', anchor_date - interval '20 days'),
    ('40000000-0000-0000-0000-000000000004', demo_user_id, '10000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000013', 'INV-1027', 420.00, 'paid', anchor_date - interval '10 days', anchor_date + interval '4 days', anchor_date - interval '2 days', anchor_date - interval '10 days'),
    ('40000000-0000-0000-0000-000000000005', demo_user_id, '10000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000015', 'INV-1028', 7200.00, 'paid', anchor_date - interval '31 days', anchor_date - interval '17 days', anchor_date - interval '14 days', anchor_date - interval '31 days'),
    ('40000000-0000-0000-0000-000000000006', demo_user_id, '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000018', 'INV-1029', 680.00, 'paid', anchor_date - interval '23 days', anchor_date - interval '9 days', anchor_date - interval '7 days', anchor_date - interval '23 days'),
    ('40000000-0000-0000-0000-000000000007', demo_user_id, '10000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000019', 'INV-1030', 575.00, 'paid', anchor_date - interval '15 days', anchor_date - interval '1 day', anchor_date - interval '3 days', anchor_date - interval '15 days'),
    ('40000000-0000-0000-0000-000000000008', demo_user_id, '10000000-0000-0000-0000-000000000013', null, 'INV-1031', 450.00, 'draft', null, null, null, anchor_date - interval '1 day'),
    ('40000000-0000-0000-0000-000000000009', demo_user_id, '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000021', 'INV-1032', 2850.00, 'paid', anchor_date - interval '41 days', anchor_date - interval '27 days', anchor_date - interval '25 days', anchor_date - interval '41 days'),
    ('40000000-0000-0000-0000-000000000010', demo_user_id, '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000023', 'INV-1033', 295.00, 'paid', anchor_date - interval '50 days', anchor_date - interval '36 days', anchor_date - interval '35 days', anchor_date - interval '50 days'),
    ('40000000-0000-0000-0000-000000000011', demo_user_id, '10000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000028', 'INV-1034', 510.00, 'paid', anchor_date - interval '44 days', anchor_date - interval '30 days', anchor_date - interval '28 days', anchor_date - interval '44 days'),
    ('40000000-0000-0000-0000-000000000012', demo_user_id, '10000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000030', 'INV-1035', 1120.00, 'paid', anchor_date - interval '18 days', anchor_date - interval '4 days', anchor_date - interval '1 day', anchor_date - interval '18 days'),
    ('40000000-0000-0000-0000-000000000013', demo_user_id, '10000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000014', 'INV-1036', 1180.00, 'sent', anchor_date - interval '2 days', anchor_date + interval '12 days', null, anchor_date - interval '2 days'),
    ('40000000-0000-0000-0000-000000000014', demo_user_id, '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'INV-1037', 2450.00, 'sent', anchor_date - interval '1 day', anchor_date + interval '13 days', null, anchor_date - interval '1 day'),
    ('40000000-0000-0000-0000-000000000015', demo_user_id, '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000037', 'INV-1038', 690.00, 'sent', anchor_date, anchor_date + interval '14 days', null, anchor_date),
    ('40000000-0000-0000-0000-000000000016', demo_user_id, '10000000-0000-0000-0000-000000000016', null, 'INV-1039', 1250.00, 'draft', null, null, null, anchor_date),
    ('40000000-0000-0000-0000-000000000017', demo_user_id, '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009', 'INV-1040', 720.00, 'sent', anchor_date - interval '3 days', anchor_date + interval '11 days', null, anchor_date - interval '3 days'),
    ('40000000-0000-0000-0000-000000000018', demo_user_id, '10000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000012', 'INV-1041', 540.00, 'sent', anchor_date - interval '1 day', anchor_date + interval '13 days', null, anchor_date - interval '1 day'),
    ('40000000-0000-0000-0000-000000000019', demo_user_id, '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000026', 'INV-1042', 330.00, 'overdue', anchor_date - interval '35 days', anchor_date - interval '21 days', null, anchor_date - interval '35 days'),
    ('40000000-0000-0000-0000-000000000020', demo_user_id, '10000000-0000-0000-0000-000000000020', null, 'INV-1043', 2100.00, 'draft', null, null, null, anchor_date);
end $$;
