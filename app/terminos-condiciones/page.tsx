import Navbar from "@/components/Navbar";
import HomeFooter from "@/components/home/HomeFooter";
import WhatsAppButton from "@/components/WhatsAppButton";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import { siteConfig } from "@/lib/siteConfig";

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: `Términos y Condiciones - ${SITE_NAME}`,
  description: `Términos y condiciones generales de contratación de servicios turísticos de ${SITE_NAME}. ${SITE_DESCRIPTION}`,
  alternates: {
    canonical: `${siteUrl}/terminos-condiciones`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/terminos-condiciones`,
    title: `Términos y Condiciones - ${SITE_NAME}`,
    description: `Términos y condiciones generales de contratación de servicios turísticos de ${SITE_NAME}.`,
    siteName: SITE_NAME,
    locale: siteConfig.seo.locale,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const SECTIONS = [
  { id: "informacion-general", n: "1", title: "INFORMACIÓN GENERAL" },
  { id: "reservas", n: "2", title: "RESERVAS" },
  { id: "precios", n: "3", title: "PRECIOS" },
  { id: "formas-de-pago", n: "4", title: "FORMAS DE PAGO" },
  { id: "confirmacion-y-documentacion", n: "5", title: "CONFIRMACIÓN Y DOCUMENTACIÓN DE LA RESERVA" },
  { id: "modificaciones", n: "6", title: "MODIFICACIONES DE RESERVAS" },
  { id: "cancelaciones-y-reembolsos", n: "7", title: "CANCELACIONES Y REEMBOLSOS" },
  { id: "no-show", n: "8", title: "NO PRESENTACIÓN (NO SHOW)" },
  { id: "horarios-y-puntos-de-encuentro", n: "9", title: "HORARIOS Y PUNTOS DE ENCUENTRO" },
  { id: "condiciones-climaticas", n: "10", title: "CONDICIONES CLIMÁTICAS Y FUERZA MAYOR" },
  { id: "parques-nacionales", n: "11", title: "PARQUES NACIONALES, ENTRADAS Y TASAS" },
  { id: "salud-y-aptitud", n: "12", title: "SALUD Y APTITUD PARA LAS ACTIVIDADES" },
  { id: "menores-de-edad", n: "13", title: "MENORES DE EDAD" },
  { id: "servicios-terceros", n: "14", title: "SERVICIOS PRESTADOS POR TERCEROS" },
  { id: "transporte", n: "15", title: "TRANSPORTE" },
  { id: "alquiler-bicicletas", n: "16", title: "ALQUILER DE BICICLETAS" },
  { id: "objetos-personales", n: "17", title: "OBJETOS PERSONALES" },
  { id: "seguro-de-viaje", n: "18", title: "SEGURO DE VIAJE" },
  { id: "fotografias", n: "19", title: "FOTOGRAFÍAS Y MATERIAL AUDIOVISUAL" },
  { id: "proteccion-de-datos", n: "20", title: "PROTECCIÓN DE DATOS PERSONALES" },
  { id: "comunicaciones", n: "21", title: "COMUNICACIONES" },
  { id: "propiedad-intelectual", n: "22", title: "PROPIEDAD INTELECTUAL" },
  { id: "informacion-del-sitio", n: "23", title: "INFORMACIÓN DEL SITIO WEB" },
  { id: "reclamos", n: "24", title: "RECLAMOS" },
  { id: "responsabilidad", n: "25", title: "RESPONSABILIDAD" },
  { id: "aceptacion", n: "26", title: "ACEPTACIÓN DE LOS TÉRMINOS Y CONDICIONES" },
  { id: "legislacion", n: "27", title: "LEGISLACIÓN APLICABLE" },
  { id: "contacto", n: "28", title: "CONTACTO" },
];

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-600">
          <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function H2({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="flex items-baseline gap-3 text-base font-semibold tracking-tight text-slate-900 md:text-lg">
      <span className="font-mono text-sm font-medium tabular-nums text-slate-400">{n}.</span>
      <span>{title}</span>
    </h2>
  );
}

export default function TerminosCondicionesPage() {
  return (
    <>
      <Navbar variant="homeMockup" reserveSpace />
      <WhatsAppButton />

      <div className="min-h-screen bg-[#FAFAF9]">
        {/* Hero */}
        <div className="border-b border-slate-200/70 bg-white pt-28 pb-10 md:pt-32 md:pb-12">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                Última actualización: septiembre de 2026
              </p>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                TÉRMINOS Y CONDICIONES
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                Bienvenido a BAFT. Los presentes Términos y Condiciones regulan el acceso y uso del sitio web de BAFT, así como la contratación de excursiones, actividades, traslados, alquiler de bicicletas y demás servicios turísticos ofrecidos a través de nuestra plataforma.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
                Al realizar una reserva o contratar cualquiera de nuestros servicios, el pasajero declara haber leído, comprendido y aceptado estos Términos y Condiciones.
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-3xl py-10 md:py-12">
            {/* Índice */}
            <nav aria-label="Índice de contenidos" className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Contenido</p>
              <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="group flex gap-2 rounded-lg px-2 py-1.5 text-[13px] leading-snug text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span className="font-mono tabular-nums text-slate-400">{s.n}.</span>
                      <span className="group-hover:underline group-hover:underline-offset-4">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            {/* Contenido */}
            <article className="mt-6 space-y-8">
              <section id="informacion-general" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="1" title="INFORMACIÓN GENERAL" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT es una agencia de turismo con operaciones en El Calafate, EL Chalten Provincia de Santa Cruz, Patagonia Argentina, Puerto Natales y Torres del Paine Provincia de Magallanes, Patagonia Chilena, dedicada a la comercialización y prestación de servicios turísticos, incluyendo excursiones, actividades, traslados, alquiler de bicicletas y experiencias en Patagonia.</p>
                  <p>Los servicios publicados en nuestro sitio pueden ser prestados directamente por BAFT o por terceros proveedores especializados. En aquellos casos en los que intervenga un proveedor externo, la prestación del servicio estará también sujeta a las condiciones particulares establecidas por dicho proveedor.</p>
                  <p>La información publicada en el sitio web, incluyendo itinerarios, horarios, precios, fotografías y descripciones, tiene carácter informativo y puede estar sujeta a modificaciones por razones operativas, climáticas, de seguridad o por decisiones de los prestadores.</p>
                </div>
              </section>

              <section id="reservas" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="2" title="RESERVAS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Las reservas pueden realizarse a través de nuestro sitio web, WhatsApp, correo electrónico, redes sociales, plataformas de reserva u otros canales habilitados por BAFT.</p>
                  <p>Una solicitud de reserva no implica necesariamente que el servicio se encuentre confirmado.</p>
                  <p>La reserva se considerará confirmada únicamente cuando BAFT haya comunicado expresamente su confirmación y, cuando corresponda, se haya recibido el pago requerido.</p>
                  <p>El pasajero es responsable de proporcionar información correcta y completa al momento de realizar la reserva, incluyendo:</p>
                </div>
                <List items={[
                  "Nombre y apellido.",
                  "Nacionalidad.",
                  "Número de documento o pasaporte cuando sea requerido.",
                  "Fecha de nacimiento cuando corresponda.",
                  "Número de teléfono y WhatsApp.",
                  "Correo electrónico.",
                  "Datos del alojamiento.",
                  "Información necesaria para el servicio contratado.",
                  "Cualquier condición o requerimiento especial que pueda afectar la prestación del servicio.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">BAFT no será responsable por inconvenientes derivados de información incorrecta, incompleta o desactualizada proporcionada por el pasajero.</p>
              </section>

              <section id="precios" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="3" title="PRECIOS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Los precios publicados en el sitio web corresponden al servicio indicado en cada producto y pueden estar sujetos a modificaciones sin previo aviso.</p>
                  <p>El precio aplicable será el informado al momento de realizar la reserva.</p>
                  <p>Los servicios incluidos y no incluidos estarán especificados en la descripción correspondiente a cada excursión o actividad.</p>
                  <p>Los precios pueden variar según:</p>
                </div>
                <List items={[
                  "Temporada.",
                  "Fecha del servicio.",
                  "Disponibilidad.",
                  "Tipo de servicio.",
                  "Cantidad de pasajeros.",
                  "Categoría de transporte.",
                  "Proveedor.",
                  "Promociones vigentes.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Cuando existan cargos adicionales, impuestos, tasas, entradas, suplementos o servicios opcionales, estos serán informados al pasajero cuando corresponda.</p>
              </section>

              <section id="formas-de-pago" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="4" title="FORMAS DE PAGO" />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">BAFT podrá aceptar, según el servicio y las condiciones vigentes:</p>
                <List items={[
                  "Efectivo.",
                  "Transferencia bancaria.",
                  "Tarjeta de crédito o débito.",
                  "Plataformas de pago online.",
                  "Otras modalidades de pago habilitadas por BAFT.",
                ]} />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Determinados medios de pago pueden estar sujetos a cargos, comisiones o diferencias de precio, los cuales serán informados previamente al pasajero.</p>
                  <p>Una reserva que requiera pago anticipado no se considerará confirmada hasta que BAFT haya recibido y verificado el pago correspondiente.</p>
                </div>
              </section>

              <section id="confirmacion-y-documentacion" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="5" title="CONFIRMACIÓN Y DOCUMENTACIÓN DE LA RESERVA" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Una vez confirmada la reserva, BAFT podrá enviar al pasajero un comprobante, voucher o confirmación electrónica.</p>
                  <p>El pasajero deberá revisar la información contenida en dicha confirmación y comunicar cualquier error inmediatamente.</p>
                  <p>El voucher puede incluir:</p>
                </div>
                <List items={[
                  "Fecha del servicio.",
                  "Horario.",
                  "Punto de encuentro.",
                  "Nombre de los pasajeros.",
                  "Servicio contratado.",
                  "Información del proveedor.",
                  "Recomendaciones especiales.",
                  "Condiciones particulares.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">El pasajero deberá conservar la confirmación de la reserva y presentarla cuando sea requerida.</p>
              </section>

              <section id="modificaciones" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="6" title="MODIFICACIONES DE RESERVAS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Las solicitudes de modificación de una reserva estarán sujetas a disponibilidad y a las condiciones particulares del servicio contratado 48 hs antes del servicio.</p>
                  <p>Los cambios pueden incluir:</p>
                </div>
                <List items={[
                  "Fecha.",
                  "Horario.",
                  "Cantidad de pasajeros.",
                  "Datos del pasajero.",
                  "Alojamiento.",
                  "Punto de recogida.",
                ]} />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT hará todo lo posible por atender las solicitudes de modificación, pero no garantiza que puedan realizarse.</p>
                  <p>Algunos servicios, especialmente aquellos que requieren reservas anticipadas con terceros, pueden no admitir modificaciones o pueden generar cargos adicionales.</p>
                </div>
              </section>

              <section id="cancelaciones-y-reembolsos" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="7" title="CANCELACIONES Y REEMBOLSOS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Las condiciones de cancelación y reembolso pueden variar según el servicio contratado.</p>
                  <p>Cada excursión o actividad podrá contar con una política de cancelación específica, que será informada al pasajero durante el proceso de reserva o en la confirmación correspondiente. La mayoría de estas son 48 hs antes del inicio del servicio o antes</p>
                  <p>Cuando exista una política específica del proveedor, dicha política será aplicable a la reserva.</p>
                  <p>Las solicitudes de cancelación deberán realizarse por escrito a través de los canales oficiales de BAFT.</p>
                  <p>No se considerarán válidas las solicitudes de cancelación realizadas únicamente de forma verbal a conductores, guías, hoteles u otros prestadores.</p>
                  <p>Los reembolsos, cuando correspondan, se efectuarán utilizando, en la medida de lo posible, el mismo medio utilizado para realizar el pago.</p>
                  <p>Los gastos o comisiones cobrados por plataformas de pago, bancos o terceros podrán no ser reembolsables cuando hayan sido efectivamente aplicados y no dependan de BAFT.</p>
                </div>
              </section>

              <section id="no-show" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="8" title="NO PRESENTACIÓN (NO SHOW)" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Si el pasajero no se presenta en el lugar y horario indicado para el servicio, la reserva podrá considerarse utilizada y no dará derecho a reembolso, salvo que las condiciones particulares del servicio establezcan lo contrario.</p>
                  <p>Se recomienda al pasajero estar preparado y disponible en el punto de encuentro con la anticipación indicada en el voucher.</p>
                  <p>BAFT no será responsable cuando el pasajero no pueda realizar el servicio debido a:</p>
                </div>
                <List items={[
                  "Llegada tardía.",
                  "Confusión respecto del punto de encuentro.",
                  "Falta de atención a las comunicaciones.",
                  "Información incorrecta proporcionada por el pasajero.",
                  "No disponibilidad en el alojamiento informado.",
                ]} />
              </section>

              <section id="horarios-y-puntos-de-encuentro" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="9" title="HORARIOS Y PUNTOS DE ENCUENTRO" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Los horarios indicados en las reservas son horarios de referencia y pueden sufrir modificaciones por razones operativas, climáticas, de tránsito, seguridad o decisiones del proveedor.</p>
                  <p>En servicios con recogida en alojamiento, el pasajero deberá encontrarse preparado en el lugar indicado con suficiente anticipación.</p>
                  <p>En servicios con punto de encuentro, será responsabilidad del pasajero presentarse en el lugar y horario especificados.</p>
                  <p>BAFT podrá comunicar modificaciones mediante WhatsApp, correo electrónico u otros medios de contacto proporcionados por el pasajero.</p>
                </div>
              </section>

              <section id="condiciones-climaticas" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="10" title="CONDICIONES CLIMÁTICAS Y FUERZA MAYOR" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Muchas de las actividades turísticas ofrecidas por BAFT se desarrollan en ambientes naturales y están sujetas a condiciones climáticas y operativas.</p>
                  <p>Por razones de seguridad, una excursión podrá ser:</p>
                </div>
                <List items={[
                  "Modificada.",
                  "Retrasada.",
                  "Reprogramada.",
                  "Suspendida.",
                  "Cancelada.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Estas decisiones podrán ser tomadas por BAFT, el proveedor, el guía, el transportista, las autoridades competentes o el responsable de la actividad.</p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Entre las causas posibles se incluyen:</p>
                <List items={[
                  "Condiciones meteorológicas adversas.",
                  "Viento.",
                  "Nieve.",
                  "Hielo.",
                  "Lluvia.",
                  "Incendios.",
                  "Cierres de rutas.",
                  "Cierres de parques.",
                  "Alertas de seguridad.",
                  "Situaciones de emergencia.",
                  "Restricciones de navegación.",
                  "Fuerza mayor.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Cuando corresponda un reembolso o reprogramación, se aplicarán las condiciones establecidas para el servicio específico.</p>
              </section>

              <section id="parques-nacionales" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="11" title="PARQUES NACIONALES, ENTRADAS Y TASAS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Algunas excursiones requieren el pago de entradas a parques nacionales, reservas naturales, áreas protegidas u otros establecimientos.</p>
                  <p>Cuando la entrada no esté incluida en el precio del servicio, el pasajero será responsable de adquirirla y cumplir con las condiciones establecidas por la autoridad correspondiente.</p>
                  <p>BAFT podrá informar al pasajero sobre los canales oficiales para adquirir dichas entradas.</p>
                  <p>Los cierres, restricciones o modificaciones establecidos por las autoridades competentes podrán afectar la prestación del servicio.</p>
                </div>
              </section>

              <section id="salud-y-aptitud" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="12" title="SALUD Y APTITUD PARA LAS ACTIVIDADES" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>El pasajero es responsable de evaluar su propia condición física y de informar previamente cualquier circunstancia relevante que pueda afectar su participación.</p>
                  <p>Algunas actividades pueden requerir un determinado nivel de condición física, movilidad o experiencia.</p>
                  <p>Las excursiones de trekking, kayak, bicicleta, navegación u otras actividades de aventura pueden presentar riesgos inherentes a su naturaleza.</p>
                  <p>El pasajero deberá seguir en todo momento las instrucciones de los guías, instructores, conductores y responsables de seguridad.</p>
                  <p>BAFT podrá impedir la participación de una persona cuando, por razones de seguridad, el responsable de la actividad considere que no se encuentra en condiciones adecuadas para realizarla.</p>
                </div>
              </section>

              <section id="menores-de-edad" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="13" title="MENORES DE EDAD" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Los menores de edad deberán cumplir con las condiciones específicas establecidas para cada excursión o actividad.</p>
                  <p>Cuando corresponda, deberán estar acompañados por un adulto responsable.</p>
                  <p>Determinadas actividades pueden establecer edades mínimas, restricciones de peso, altura, experiencia o condiciones físicas.</p>
                  <p>Estas condiciones serán informadas en la descripción del servicio o durante el proceso de reserva.</p>
                </div>
              </section>

              <section id="servicios-terceros" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="14" title="SERVICIOS PRESTADOS POR TERCEROS" />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Algunas experiencias comercializadas por BAFT son prestadas total o parcialmente por terceros, tales como:</p>
                <List items={[
                  "Empresas de transporte.",
                  "Operadores de navegación.",
                  "Empresas de trekking.",
                  "Guías.",
                  "Estancias.",
                  "Empresas de kayak.",
                  "Parques o áreas protegidas.",
                  "Alojamientos.",
                  "Otros operadores turísticos.",
                ]} />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Cada proveedor será responsable de la correcta prestación del servicio que se encuentre bajo su operación, de acuerdo con la normativa y condiciones aplicables.</p>
                  <p>BAFT realizará las gestiones correspondientes ante el proveedor cuando sea necesario y actuará como canal de comunicación con el pasajero.</p>
                </div>
              </section>

              <section id="transporte" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="15" title="TRANSPORTE" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Los horarios de transporte pueden sufrir modificaciones por razones operativas, climáticas, de tránsito o seguridad.</p>
                  <p>El pasajero deberá respetar las indicaciones del conductor y las normas de seguridad correspondientes.</p>
                  <p>Cuando el transporte incluya recogida y regreso al alojamiento, el servicio estará sujeto a las zonas y condiciones especificadas en cada excursión.</p>
                </div>
              </section>

              <section id="alquiler-bicicletas" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="16" title="ALQUILER DE BICICLETAS" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>En los servicios de alquiler de bicicletas, el usuario deberá utilizar el equipamiento de forma responsable y respetar las normas de circulación y seguridad.</p>
                  <p>La bicicleta y los accesorios entregados deberán ser devueltos en las mismas condiciones en las que fueron recibidos, salvo el desgaste normal derivado de su uso.</p>
                  <p>El usuario será responsable por:</p>
                </div>
                <List items={[
                  "Daños ocasionados por uso negligente.",
                  "Pérdida de la bicicleta.",
                  "Robo.",
                  "Pérdida o daño de accesorios.",
                  "Devolución fuera del horario acordado.",
                  "Uso contrario a las instrucciones proporcionadas por BAFT.",
                ]} />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT podrá solicitar documentación personal y/o una garantía antes de entregar la bicicleta.</p>
                  <p>Las condiciones específicas del alquiler, incluyendo tarifas, horarios, garantías y responsabilidades, serán informadas antes de la entrega.</p>
                </div>
              </section>

              <section id="objetos-personales" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="17" title="OBJETOS PERSONALES" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>El pasajero será responsable de sus objetos personales durante las excursiones y actividades.</p>
                  <p>BAFT no será responsable por pérdida, robo o daño de objetos personales, salvo cuando exista responsabilidad legalmente atribuible a BAFT.</p>
                  <p>Se recomienda no llevar objetos de valor innecesarios durante las actividades.</p>
                </div>
              </section>

              <section id="seguro-de-viaje" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="18" title="SEGURO DE VIAJE" />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">BAFT recomienda a todos los pasajeros contar con un seguro de viaje adecuado que incluya, cuando corresponda:</p>
                <List items={[
                  "Asistencia médica.",
                  "Accidentes.",
                  "Cancelación de viaje.",
                  "Equipaje.",
                  "Actividades de aventura.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Cuando una actividad requiera obligatoriamente un seguro específico, dicha condición será informada previamente.</p>
              </section>

              <section id="fotografias" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="19" title="FOTOGRAFÍAS Y MATERIAL AUDIOVISUAL" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Durante algunas excursiones podrán tomarse fotografías o videos con fines operativos, promocionales o informativos.</p>
                  <p>Cuando el uso de imágenes de pasajeros requiera autorización específica conforme a la normativa aplicable, BAFT solicitará dicha autorización.</p>
                  <p>El pasajero podrá comunicar a BAFT cualquier solicitud relacionada con el uso de su imagen.</p>
                </div>
              </section>

              <section id="proteccion-de-datos" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="20" title="PROTECCIÓN DE DATOS PERSONALES" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT recopilará y tratará los datos personales proporcionados por los usuarios con el objetivo de gestionar reservas, prestar servicios, procesar pagos, comunicarse con los pasajeros y cumplir con obligaciones legales.</p>
                  <p>Los datos podrán ser compartidos con proveedores cuando resulte necesario para prestar el servicio contratado.</p>
                  <p>BAFT adoptará medidas razonables para proteger la información personal bajo su responsabilidad.</p>
                  <p>El tratamiento de datos personales se realizará de acuerdo con la legislación argentina aplicable.</p>
                  <p>Para obtener información adicional sobre el tratamiento de datos personales, el usuario podrá comunicarse con BAFT a través de nuestros canales oficiales.</p>
                </div>
              </section>

              <section id="comunicaciones" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="21" title="COMUNICACIONES" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Al proporcionar un número de teléfono, WhatsApp o correo electrónico, el pasajero autoriza a BAFT a utilizar dichos medios para comunicaciones relacionadas con su reserva y prestación del servicio.</p>
                  <p>Estas comunicaciones pueden incluir:</p>
                </div>
                <List items={[
                  "Confirmaciones.",
                  "Vouchers.",
                  "Cambios de horario.",
                  "Información sobre puntos de encuentro.",
                  "Modificaciones operativas.",
                  "Cancelaciones.",
                  "Información necesaria para la prestación del servicio.",
                ]} />
              </section>

              <section id="propiedad-intelectual" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="22" title="PROPIEDAD INTELECTUAL" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Todo el contenido publicado en el sitio web de BAFT, incluyendo textos, fotografías, diseños, logotipos, gráficos, videos, marcas y otros elementos, pertenece a BAFT o se utiliza con autorización de sus respectivos titulares.</p>
                  <p>No está permitido reproducir, copiar, modificar, distribuir o utilizar dicho contenido con fines comerciales sin autorización previa.</p>
                </div>
              </section>

              <section id="informacion-del-sitio" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="23" title="INFORMACIÓN DEL SITIO WEB" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT procura mantener la información del sitio web actualizada y correcta.</p>
                  <p>Sin embargo, pueden producirse errores, cambios de disponibilidad, modificaciones de horarios, tarifas o condiciones de los servicios.</p>
                  <p>BAFT se reserva el derecho de corregir errores y actualizar la información publicada.</p>
                  <p>Las fotografías utilizadas en el sitio tienen carácter ilustrativo y pueden no representar exactamente las condiciones que encontrará el pasajero durante su visita.</p>
                </div>
              </section>

              <section id="reclamos" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="24" title="RECLAMOS" />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Cualquier reclamo relacionado con un servicio deberá ser comunicado a BAFT lo antes posible y, preferentemente, durante la prestación del servicio, para permitir que podamos gestionar la situación con el proveedor correspondiente.</p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">Los reclamos deberán incluir:</p>
                <List items={[
                  "Nombre del pasajero.",
                  "Número o código de reserva.",
                  "Fecha del servicio.",
                  "Servicio contratado.",
                  "Descripción del inconveniente.",
                  "Documentación o fotografías cuando corresponda.",
                ]} />
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">BAFT analizará cada situación y realizará las gestiones correspondientes de acuerdo con las condiciones del servicio y la normativa aplicable.</p>
              </section>

              <section id="responsabilidad" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="25" title="RESPONSABILIDAD" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>BAFT será responsable por las obligaciones que legalmente le correspondan respecto de los servicios que comercialice o preste.</p>
                  <p>Cuando el servicio sea operado por un tercero, las responsabilidades correspondientes a la ejecución directa del servicio se regirán también por las condiciones del proveedor y la legislación aplicable.</p>
                  <p>Nada de lo establecido en estos Términos y Condiciones pretende excluir o limitar derechos que correspondan al consumidor de acuerdo con la legislación vigente.</p>
                </div>
              </section>

              <section id="aceptacion" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="26" title="ACEPTACIÓN DE LOS TÉRMINOS Y CONDICIONES" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Al realizar una reserva, efectuar un pago o contratar un servicio a través de BAFT, el pasajero declara haber leído y aceptado estos Términos y Condiciones, así como las condiciones particulares aplicables al servicio contratado.</p>
                  <p>Las condiciones particulares informadas para una determinada excursión tendrán aplicación específica cuando difieran de las condiciones generales aquí establecidas.</p>
                </div>
              </section>

              <section id="legislacion" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="27" title="LEGISLACIÓN APLICABLE" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Estos Términos y Condiciones se regirán por las leyes aplicables de la República Argentina.</p>
                  <p>Cualquier controversia será tratada de acuerdo con la normativa vigente y los derechos que correspondan a los consumidores.</p>
                </div>
              </section>

              <section id="contacto" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 md:p-7">
                <H2 n="28" title="CONTACTO" />
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-600">
                  <p>Para consultas, modificaciones, cancelaciones o reclamos, el pasajero podrá comunicarse con BAFT a través de los canales oficiales publicados en nuestro sitio web.</p>
                  <p>BAFT – Patagonia Argentina</p>
                  <p>El Calafate, Santa Cruz, Argentina.</p>
                  <p>WhatsApp: +549112966701907</p>
                  <p>Email: reservas@baftravel.com</p>
                  <p>Sitio web: www.baftravel.com</p>
                  <p>BAFT agradece su confianza y espera acompañarlo en su experiencia por la Patagonia.</p>
                </div>
              </section>
            </article>
          </div>
        </div>
      </div>

      <HomeFooter />
    </>
  );
}
