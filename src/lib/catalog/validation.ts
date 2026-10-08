import type {
  FulfillmentPolicy,
  ProductVariant,
} from "../../types/catalog.ts";

export interface CatalogValidationError {
  field: string;
  message: string;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateFulfillmentPolicy(
  policy: FulfillmentPolicy,
  index: number
): CatalogValidationError[] {
  const errors: CatalogValidationError[] = [];
  const base = `fulfillmentPolicies[${index}]`;

  if (policy.mode === "ready_stock") {
    const { onHand, reserved } = policy.inventory;

    if (!isNonNegativeInteger(onHand)) {
      errors.push({
        field: `${base}.inventory.onHand`,
        message: "La existencia debe ser un entero no negativo.",
      });
    }

    if (!isNonNegativeInteger(reserved)) {
      errors.push({
        field: `${base}.inventory.reserved`,
        message: "Las reservas deben ser un entero no negativo.",
      });
    }

    if (
      isNonNegativeInteger(onHand) &&
      isNonNegativeInteger(reserved) &&
      reserved > onHand
    ) {
      errors.push({
        field: `${base}.inventory.reserved`,
        message: "Las reservas no pueden superar las existencias.",
      });
    }
  }

  if (policy.mode === "made_to_order") {
    if (!isNonNegativeInteger(policy.preparationDaysMin)) {
      errors.push({
        field: `${base}.preparationDaysMin`,
        message: "El plazo minimo debe ser un entero no negativo.",
      });
    }

    if (
      !isNonNegativeInteger(policy.preparationDaysMax) ||
      policy.preparationDaysMax < policy.preparationDaysMin
    ) {
      errors.push({
        field: `${base}.preparationDaysMax`,
        message: "El plazo maximo debe ser valido y no inferior al minimo.",
      });
    }

    if (
      policy.maxOpenOrders !== undefined &&
      (!Number.isSafeInteger(policy.maxOpenOrders) ||
        policy.maxOpenOrders <= 0)
    ) {
      errors.push({
        field: `${base}.maxOpenOrders`,
        message: "El limite de pedidos debe ser un entero positivo.",
      });
    }
  }

  return errors;
}

export function validateProductVariant(
  variant: ProductVariant
): CatalogValidationError[] {
  const errors: CatalogValidationError[] = [];

  if (!variant.sku.trim()) {
    errors.push({
      field: "sku",
      message: "El SKU no puede estar vacio.",
    });
  }

  if (!isNonNegativeInteger(variant.price.amount)) {
    errors.push({
      field: "price.amount",
      message: "El precio debe ser un entero no negativo en COP.",
    });
  }

  if (variant.fulfillmentPolicies.length === 0) {
    errors.push({
      field: "fulfillmentPolicies",
      message: "La variante debe tener una modalidad de venta.",
    });
  }

  const seenModes = new Set<string>();

  variant.fulfillmentPolicies.forEach((policy, index) => {
    if (seenModes.has(policy.mode)) {
      errors.push({
        field: `fulfillmentPolicies[${index}].mode`,
        message: "No puede repetirse una modalidad de venta.",
      });
    }

    seenModes.add(policy.mode);

    errors.push(...validateFulfillmentPolicy(policy, index));
  });

  return errors;
}