"use server";

import {
  searchCustomers,
  searchProductsForOrder,
  listCustomerDeliveryAddresses,
  type CustomerSearchResult,
} from "@/lib/supabase/queries/sales-order";
import type { ProductSearchResult, DeliveryAddressOption } from "@/types/sales-order";

export async function searchCustomersAction(
  term: string
): Promise<CustomerSearchResult[]> {
  return searchCustomers(term, 12);
}

export async function searchProductsAction(
  term: string
): Promise<ProductSearchResult[]> {
  return searchProductsForOrder(term, 12);
}

export async function listDeliveryAddressesAction(
  customerCode: string
): Promise<DeliveryAddressOption[]> {
  return listCustomerDeliveryAddresses(customerCode);
}
