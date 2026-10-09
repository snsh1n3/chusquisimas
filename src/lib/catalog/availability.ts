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

/** Disponibilidad para la cantidad solicitada, sin reservar inventario. */
export function getQuantityAvailability(
  variant: ProductVariant,
  quantity: number
): VariantAvailability {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("La cantidad debe ser un entero positivo.");
  }
  const availability = getVariantAvailability(variant);
  if (availability.status !== "ready_to_ship") return availability;
  if (availability.availableQuantity === null ||
      availability.availableQuantity >= quantity) return availability;
  const madeToOrder = variant.fulfillmentPolicies.find(
    (policy): policy is Extract<FulfillmentPolicy, { mode: "made_to_order" }> =>
      policy.mode === "made_to_order"
  );
  if (!madeToOrder) {
    return {
      status: "out_of_stock",
      purchasable: false,
      availableQuantity: availability.availableQuantity,
    };
  }
  return {
    status: "made_to_order",
    purchasable: true,
    availableQuantity: null,
    preparationDaysMin: madeToOrder.preparationDaysMin,
    preparationDaysMax: madeToOrder.preparationDaysMax,
  };
}
