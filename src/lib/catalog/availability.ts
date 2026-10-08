import type {
  FulfillmentPolicy,
  ProductVariant,
} from "../../types/catalog.ts";

import { getAvailableQuantity } from "../../types/catalog.ts";

export type AvailabilityStatus =
  | "ready_to_ship"
  | "made_to_order"
  | "out_of_stock"
  | "unavailable";

export interface VariantAvailability {
  status: AvailabilityStatus;
  purchasable: boolean;
  availableQuantity: number | null;
  preparationDaysMin?: number;
  preparationDaysMax?: number;
}

export function getVariantAvailability(
  variant: ProductVariant
): VariantAvailability {
  if (variant.status !== "active") {
    return {
      status: "unavailable",
      purchasable: false,
      availableQuantity: 0,
    };
  }

  const stockPolicy = variant.fulfillmentPolicies.find(
    (policy): policy is Extract<
      FulfillmentPolicy,
      { mode: "ready_stock" }
    > => policy.mode === "ready_stock"
  );

  const madeToOrderPolicy = variant.fulfillmentPolicies.find(
    (policy): policy is Extract<
      FulfillmentPolicy,
      { mode: "made_to_order" }
    > => policy.mode === "made_to_order"
  );

  if (stockPolicy) {
    const quantity = getAvailableQuantity(
      stockPolicy.inventory
    );

    if (quantity === null || quantity > 0) {
      return {
        status: "ready_to_ship",
        purchasable: true,
        availableQuantity: quantity,
      };
    }
  }

  if (madeToOrderPolicy) {
    return {
      status: "made_to_order",
      purchasable: true,
      availableQuantity: null,
      preparationDaysMin:
        madeToOrderPolicy.preparationDaysMin,
      preparationDaysMax:
        madeToOrderPolicy.preparationDaysMax,
    };
  }

  return {
    status: "out_of_stock",
    purchasable: false,
    availableQuantity: 0,
  };
}