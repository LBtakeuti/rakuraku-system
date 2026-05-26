-- Atomic numbering functions using advisory locks to prevent race conditions

CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_num int;
  new_code text;
BEGIN
  PERFORM pg_advisory_lock(1001);
  SELECT COALESCE(MAX(customer_code::int), 0) INTO last_num
    FROM customer
    WHERE customer_code ~ '^\d+$';
  new_code := LPAD((last_num + 1)::text, 6, '0');
  PERFORM pg_advisory_unlock(1001);
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_num int;
  new_code text;
BEGIN
  PERFORM pg_advisory_lock(1002);
  SELECT COALESCE(MAX(product_code::int), 0) INTO last_num
    FROM product
    WHERE product_code ~ '^\d+$';
  new_code := LPAD((last_num + 1)::text, 8, '0');
  PERFORM pg_advisory_unlock(1002);
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_num int;
  new_no text;
BEGIN
  PERFORM pg_advisory_lock(1003);
  SELECT COALESCE(MAX(SUBSTRING(order_no FROM 2)::int), 0) INTO last_num
    FROM sales_order
    WHERE order_no LIKE '8%';
  new_no := '8' || LPAD((last_num + 1)::text, 8, '0');
  PERFORM pg_advisory_unlock(1003);
  RETURN new_no;
END;
$$;

CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_num int;
  new_no text;
BEGIN
  PERFORM pg_advisory_lock(1004);
  SELECT COALESCE(MAX(SUBSTRING(purchase_order_no FROM 2)::int), 0) INTO last_num
    FROM purchase_order
    WHERE purchase_order_no LIKE 'P%';
  new_no := 'P' || LPAD((last_num + 1)::text, 8, '0');
  PERFORM pg_advisory_unlock(1004);
  RETURN new_no;
END;
$$;

CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_num int;
  new_no text;
BEGIN
  PERFORM pg_advisory_lock(1005);
  SELECT COALESCE(MAX(SUBSTRING(invoice_no FROM 2)::int), 0) INTO last_num
    FROM sales_invoice
    WHERE invoice_no LIKE 'N%';
  new_no := 'N' || LPAD((last_num + 1)::text, 8, '0');
  PERFORM pg_advisory_unlock(1005);
  RETURN new_no;
END;
$$;

CREATE OR REPLACE FUNCTION generate_billing_number(year_month text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix text;
  last_num int;
  new_no text;
BEGIN
  prefix := 'B' || year_month;
  PERFORM pg_advisory_lock(1006);
  SELECT COALESCE(MAX(SUBSTRING(statement_no FROM LENGTH(prefix) + 1)::int), 0) INTO last_num
    FROM billing_statement
    WHERE statement_no LIKE prefix || '%';
  new_no := prefix || LPAD((last_num + 1)::text, 3, '0');
  PERFORM pg_advisory_unlock(1006);
  RETURN new_no;
END;
$$;
