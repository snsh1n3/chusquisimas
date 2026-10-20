/**
 * Aviso de privacidad (Ley 1581 de 2012). Fuente única del texto publicado
 * en /privacidad y de la versión que acepta el cliente al registrar un pedido
 * (PRIVACY_NOTICE_VERSION en order-inputs.ts).
 *
 * Datos del responsable confirmados por el negocio el 20-oct-2026. Si se
 * vacía algún campo, la página vuelve a borrador y los pedidos en línea se
 * desactivan (ver getPublicOrdersConfig).
 */
import { PRIVACY_NOTICE_VERSION } from "../orders/order-inputs.ts";
import { ORDERS_WHATSAPP_NUMBER } from "../orders/whatsapp.ts";

export const PRIVACY_RESPONSIBLE = {
  /** Nombre completo de la persona natural responsable del tratamiento. */
  name: "Nicol Barrera",
  /** Ciudad de domicilio del responsable. */
  city: "Bogotá",
  /** Correo para consultas y reclamos sobre datos personales. */
  email: "pqr@chusquisimas.com",
} as const;

export function isPrivacyNoticeComplete(responsible: Record<string, string> = PRIVACY_RESPONSIBLE): boolean {
  return Object.values(responsible).every((value) => value.trim().length > 0);
}

const PENDING = "[pendiente]";
const or = (value: string) => value.trim() || PENDING;
const whatsapp = `+${ORDERS_WHATSAPP_NUMBER.slice(0, 2)} ${ORDERS_WHATSAPP_NUMBER.slice(2, 5)} ${ORDERS_WHATSAPP_NUMBER.slice(5, 8)} ${ORDERS_WHATSAPP_NUMBER.slice(8)}`;

export interface NoticeSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

export function privacyNoticeSections(): NoticeSection[] {
  const r = PRIVACY_RESPONSIBLE;
  return [
    {
      title: "Responsable del tratamiento",
      paragraphs: [
        `${or(r.name)}, persona natural que opera la marca Chusquisimas, con domicilio en ${or(r.city)}, Colombia.`,
        `Contacto: ${or(r.email)} · WhatsApp ${whatsapp}.`,
      ],
    },
    {
      title: "Datos que recogemos",
      paragraphs: [
        "Al registrar un pedido en chusquisimas.com recogemos tu nombre, tu número de WhatsApp y tu ciudad. " +
        "La dirección de entrega te la pedimos por WhatsApp, solo para despachar el pedido.",
        "No recogemos datos sensibles ni datos de tarjetas: en la página no se realizan pagos.",
      ],
    },
    {
      title: "Para qué los usamos",
      items: [
        "Registrar, confirmar y gestionar tu pedido.",
        "Coordinar contigo el pago y la entrega.",
        "Atender peticiones, quejas, reclamos y garantías.",
        "Cumplir obligaciones legales, contables y tributarias.",
      ],
      paragraphs: [
        "No usamos tus datos para enviarte publicidad sin una autorización aparte, y no los vendemos ni los cedemos.",
      ],
    },
    {
      title: "Quién más interviene",
      paragraphs: [
        "Los datos se almacenan en servicios de Cloudflare, nuestro proveedor de alojamiento. " +
        "Para entregar el pedido los compartimos con la empresa de mensajería que lo transporte. " +
        "La conversación por WhatsApp, que inicias tú, se rige además por las políticas de WhatsApp.",
      ],
    },
    {
      title: "Tus derechos",
      items: [
        "Conocer, actualizar y rectificar tus datos.",
        "Pedir prueba de la autorización que nos diste.",
        "Saber qué uso les hemos dado.",
        "Revocar la autorización o pedir que los eliminemos, cuando no exista un deber legal de conservarlos.",
        "Acceder a ellos gratuitamente.",
        "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).",
      ],
    },
    {
      title: "Cómo ejercerlos",
      paragraphs: [
        `Escríbenos a ${or(r.email)} o por WhatsApp al ${whatsapp}, indicando tu nombre y tu solicitud. ` +
        "Respondemos las consultas en un máximo de 10 días hábiles y los reclamos en un máximo de 15 días hábiles.",
        `Puedes solicitar nuestra política de tratamiento de datos completa en ${or(r.email)}.`,
      ],
    },
  ];
}

export { PRIVACY_NOTICE_VERSION };
