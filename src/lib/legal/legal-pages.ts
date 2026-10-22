/**
 * Páginas legales y de confianza de la tienda (términos, envíos, cambios y PQR).
 *
 * Contenido redactado el 22-oct-2026 con los datos que dio el negocio (medios
 * de pago, tiempos de envío y política de daños) y la Ley 1480 de 2011:
 * retracto (art. 47), comercio electrónico y enlace a la SIC (art. 50,
 * modificado por la Ley 2439 de 2024) y reversión del pago (art. 51,
 * Decreto 587 de 2016). Pendiente de revisión jurídica (matriz LEG-02 a LEG-07).
 *
 * Pendiente por decisión del negocio: NIT y dirección de notificación (art. 50).
 */
import { ORDERS_WHATSAPP_NUMBER } from "../orders/whatsapp.ts";
import { ORDER_RESERVATION_HOURS } from "../orders/order-inputs.ts";
import { PRIVACY_RESPONSIBLE } from "./privacy-notice.ts";

export const LEGAL_PAGES_VERSION = "2026-10-22";
export const SIC_URL = "https://www.sic.gov.co";
export const PQR_EMAIL = PRIVACY_RESPONSIBLE.email;
export const WHATSAPP_DISPLAY = `+${ORDERS_WHATSAPP_NUMBER.slice(0, 2)} ${ORDERS_WHATSAPP_NUMBER.slice(2, 5)} ${ORDERS_WHATSAPP_NUMBER.slice(5, 8)} ${ORDERS_WHATSAPP_NUMBER.slice(8)}`;

/** Horas para reportar daños de transporte con fotos (política del negocio). */
export const DAMAGE_REPORT_HOURS = 48;
export const PREPARATION_DAYS = 14;
export const TRANSIT_DAYS = { local: "1 a 2", national: "3 a 6" } as const;

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  links?: Array<{ label: string; href: string }>;
}

export interface LegalPage {
  slug: "terminos" | "envios" | "cambios" | "pqr";
  title: string;
  description: string;
  intro: string;
  sections: LegalSection[];
}

const seller = `${PRIVACY_RESPONSIBLE.name}, persona natural que opera la marca Chusquisimas, con domicilio en ${PRIVACY_RESPONSIBLE.city}, Colombia`;
const contact = `WhatsApp ${WHATSAPP_DISPLAY} · ${PQR_EMAIL}`;

export const LEGAL_PAGES: readonly LegalPage[] = [
  {
    slug: "terminos",
    title: "Términos y condiciones",
    description: "Quién vende, cómo se hace un pedido, precios y medios de pago en Chusquisimas.",
    intro: "Estas condiciones aplican a los pedidos que registras en chusquisimas.com.",
    sections: [
      {
        title: "Quién vende",
        paragraphs: [`${seller}.`, `Contacto: ${contact}.`],
      },
      {
        title: "Productos y precios",
        paragraphs: [
          "Nuestros productos son hechos a mano: puede haber pequeñas diferencias de color, textura o forma entre una pieza y otra, y no se consideran defectos.",
          "Los precios están en pesos colombianos (COP) y son el valor de cada producto. El envío se muestra aparte, antes de registrar el pedido; si aparece «por confirmar», te lo confirmamos antes de que pagues.",
        ],
      },
      {
        title: "Cómo se hace un pedido",
        items: [
          "Eliges tus productos, registras el pedido con tu nombre, WhatsApp y municipio, y recibes un número de pedido.",
          "Registrar el pedido no es una compra todavía: la compra queda confirmada cuando acordamos contigo por WhatsApp la disponibilidad, la dirección, el total y el pago.",
          `Los productos de entrega inmediata quedan apartados ${ORDER_RESERVATION_HOURS} horas. Si en ese tiempo no confirmamos el pedido, se cancela y las unidades se liberan.`,
          `Los productos bajo pedido se preparan en hasta ${PREPARATION_DAYS} días, contados desde la confirmación.`,
        ],
      },
      {
        title: "Medios de pago",
        items: [
          "Nequi",
          "Daviplata",
          "Bre-B",
          "Efectivo contra entrega, según la zona de envío (te lo confirmamos por WhatsApp).",
        ],
        paragraphs: [
          "En la página no se hacen pagos. Nunca te pediremos datos de tarjetas, claves ni códigos de verificación.",
        ],
      },
      {
        title: "Envíos, cambios y datos personales",
        links: [
          { label: "Envíos y entregas: tiempos y costos", href: "/envios" },
          { label: "Cambios, garantías y retracto", href: "/cambios" },
          { label: "Aviso de privacidad: tratamiento de tus datos", href: "/privacidad" },
          { label: "Peticiones, quejas y reclamos (PQR)", href: "/pqr" },
        ],
      },
      {
        title: "Vigencia",
        paragraphs: [
          "Aplican los términos publicados en el momento en que registras tu pedido. Si los cambiamos, publicamos la nueva versión en esta página.",
        ],
      },
    ],
  },
  {
    slug: "envios",
    title: "Envíos y entregas",
    description: "Tiempos de preparación y de entrega, costos de envío y qué hacer al recibir tu pedido.",
    intro: "Enviamos a todo Colombia desde Bogotá.",
    sections: [
      {
        title: "Tiempos de preparación",
        items: [
          "Entrega inmediata: despachamos cuando confirmamos tu pedido y el pago. Te indicamos la fecha por WhatsApp.",
          `Bajo pedido: hasta ${PREPARATION_DAYS} días de preparación, contados desde la confirmación, más el tiempo de envío.`,
        ],
      },
      {
        title: "Tiempos de envío",
        paragraphs: ["Una vez despachado el pedido, el tiempo estimado de entrega es:"],
        items: [
          `Bogotá D.C. (envío local): ${TRANSIT_DAYS.local} días hábiles.`,
          `Resto de Colombia (envío nacional): ${TRANSIT_DAYS.national} días hábiles.`,
        ],
      },
      {
        title: "Costo del envío",
        paragraphs: [
          "El envío local o nacional se elige automáticamente según el municipio que indicas, y su valor aparece en el carrito antes de registrar el pedido. Si aparece «por confirmar», te decimos el valor por WhatsApp antes de que pagues.",
          "La dirección exacta de entrega te la pedimos por WhatsApp.",
        ],
      },
      {
        title: "Al recibir tu pedido",
        paragraphs: [
          `Revísalo apenas llegue. Si algún producto llegó roto o con daños, escríbenos dentro de las ${DAMAGE_REPORT_HOURS} horas siguientes con fotos del producto y del empaque.`,
        ],
        links: [{ label: "Cambios, garantías y retracto", href: "/cambios" }],
      },
    ],
  },
  {
    slug: "cambios",
    title: "Cambios, garantías y retracto",
    description: "Qué hacer si tu pedido llega dañado, garantía legal, derecho de retracto y reversión del pago.",
    intro: "Queremos que tu pedido llegue perfecto. Si no es así, esto es lo que hacemos.",
    sections: [
      {
        title: "Productos dañados o con defectos",
        paragraphs: [
          `Si un producto llega roto, dañado o con un defecto, escríbenos dentro de las ${DAMAGE_REPORT_HOURS} horas siguientes a la entrega con tu número de pedido y fotos del producto y del empaque. Te reponemos el producto o te devolvemos su valor.`,
          "Este plazo es para gestionar rápido los daños del transporte; no reemplaza tu garantía legal.",
        ],
      },
      {
        title: "Garantía legal",
        paragraphs: [
          "Todos nuestros productos tienen la garantía legal de calidad e idoneidad que establece la Ley 1480 de 2011 (Estatuto del Consumidor). Las variaciones propias de un producto hecho a mano, y el desgaste normal por el uso, no son defectos.",
          "Respondemos las solicitudes de garantía en un máximo de 15 días hábiles.",
        ],
      },
      {
        title: "Cambios por gusto",
        paragraphs: [
          "No hacemos cambios por gusto (color, aroma u otras preferencias), salvo cuando ejerces el derecho de retracto.",
        ],
      },
      {
        title: "Derecho de retracto",
        items: [
          "Tienes 5 días hábiles desde la entrega para retractarte de la compra (artículo 47 de la Ley 1480).",
          "El producto debe devolverse sin usar y en su empaque. Los costos de devolución corren por tu cuenta.",
          "Te devolvemos todo lo que pagaste, sin descuentos, en un máximo de 30 días calendario.",
          "No aplica a productos personalizados o hechos según tus especificaciones.",
        ],
      },
      {
        title: "Reversión del pago",
        paragraphs: [
          "Si pagaste con un medio de pago electrónico y fuiste víctima de fraude, no solicitaste la operación, no recibiste el producto, o lo recibiste defectuoso o distinto a lo que pediste, puedes pedir la reversión del pago (artículo 51 de la Ley 1480).",
          "Para hacerlo, escríbenos dentro de los 5 días hábiles siguientes a la fecha en que conociste el problema o en que debías recibir el producto, e informa también a la entidad de tu medio de pago en el mismo plazo. Si se trata de un producto, déjalo a nuestra disposición para recogerlo.",
        ],
      },
      {
        title: "Cómo solicitarlo",
        paragraphs: [`Escríbenos por ${contact}, con tu número de pedido.`],
      },
    ],
  },
  {
    slug: "pqr",
    title: "Peticiones, quejas y reclamos",
    description: "Cómo presentar una petición, queja o reclamo a Chusquisimas y cuándo te respondemos.",
    intro: "Si tienes una petición, queja o reclamo, queremos saberlo.",
    sections: [
      {
        title: "Cómo presentarla",
        items: [
          `Correo: ${PQR_EMAIL}`,
          `WhatsApp: ${WHATSAPP_DISPLAY}`,
        ],
        paragraphs: [
          "Incluye tu nombre, tu número de pedido si lo tienes, lo que ocurrió y lo que solicitas. Las fotos ayudan mucho cuando se trata de un producto.",
        ],
      },
      {
        title: "Cuándo te respondemos",
        paragraphs: [
          "Te confirmamos que recibimos tu solicitud y te damos una respuesta de fondo en un máximo de 15 días hábiles.",
        ],
      },
      {
        title: "Superintendencia de Industria y Comercio",
        paragraphs: [
          "Si no estás conforme con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio (SIC), la autoridad de protección al consumidor en Colombia.",
        ],
        links: [{ label: "Superintendencia de Industria y Comercio (www.sic.gov.co)", href: SIC_URL }],
      },
    ],
  },
];

export function getLegalPage(slug: LegalPage["slug"]): LegalPage {
  const page = LEGAL_PAGES.find((candidate) => candidate.slug === slug);
  if (!page) throw new Error(`Página legal desconocida: ${slug}`);
  return page;
}
