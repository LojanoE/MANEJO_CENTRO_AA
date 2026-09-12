import type { FormTemplate } from './types'

/** Formatos de Trabajo Social y Terapia Ocupacional del centro. */

export const SOCIAL_SOCIOECONOMICA: FormTemplate = {
  id: 'social-socioeconomica',
  title: 'Ficha socioeconómica — usuario interno',
  sections: [
    {
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Usuario interno N°', prefill: 'hc' },
            { label: 'Fecha', prefill: 'today' },
            { label: 'Provincia' },
            { label: 'Cantón' },
            { label: 'Parroquia', span: 2 },
            { label: 'Barrio / comunidad', span: 2 },
          ],
        },
      ],
    },
    {
      title: '1. Datos generales del usuario',
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Nombres y apellidos', prefill: 'name', span: 3 },
            { label: 'Cédula de identidad', prefill: 'idCard' },
            { label: 'Edad', prefill: 'age' },
            { label: 'Fecha de nacimiento', prefill: 'birthDate' },
            { label: 'Religión', prefill: 'religion' },
            { label: 'Estado civil', prefill: 'maritalStatus' },
            { label: 'Ocupación', prefill: 'occupation' },
            { label: 'Representante de internamiento', span: 2 },
            { label: 'Celular / teléfono', prefill: 'phone' },
            { label: 'Fecha de ingreso', prefill: 'admission' },
            { label: 'Fecha de egreso' },
            { label: 'Referencia domiciliaria', prefill: 'address', span: 2 },
          ],
        },
        { kind: 'checks', label: 'Motivo de ingreso', cols: 4, options: ['Alcoholismo', 'Drogadicción', 'Tabaquismo', 'Otros'] },
        {
          kind: 'checks',
          label: 'Nivel de instrucción',
          cols: 3,
          options: ['Ninguno', 'Primaria', 'Secundaria', 'Superior técnico', 'Superior universitario', 'Posgrado'],
        },
        {
          kind: 'checks',
          label: 'Autoidentificación étnica',
          cols: 4,
          options: ['Mestizo', 'Afroecuatoriano', 'Blanco', 'Shuar', 'Indígena', 'Puruwá', 'Otros'],
        },
        {
          kind: 'grid',
          cols: 2,
          items: [
            { label: 'Enfermedades que ha padecido', span: 2 },
            { label: 'Estado de salud actual', span: 2 },
            { label: 'Inicio de consumo — alcohol' },
            { label: 'Inicio de consumo — drogas' },
            { label: 'Frecuencia de consumo actual' },
            { label: 'Tipo de drogas' },
            { label: 'N° de integrantes del grupo familiar', span: 2 },
          ],
        },
      ],
    },
    {
      title: '2. Composición familiar',
      blocks: [
        {
          kind: 'table',
          rows: 7,
          columns: [
            { label: 'Nombres y apellidos' },
            { label: 'Edad', width: '7%' },
            { label: 'Parentesco', width: '12%' },
            { label: 'Estado civil', width: '11%' },
            { label: 'Instrucción', width: '12%' },
            { label: 'Ocupación', width: '13%' },
            { label: 'Domicilio', width: '17%' },
          ],
        },
        {
          kind: 'table',
          label: 'Familiares con discapacidad',
          rows: 3,
          columns: [{ label: 'Nombre' }, { label: 'Tipo', width: '24%' }, { label: 'N° carnet', width: '18%' }, { label: 'Porcentaje', width: '14%' }],
        },
        {
          kind: 'checks',
          label: 'Tipo de familia',
          cols: 3,
          options: ['Nuclear', 'Extensa', 'Biparental (unión libre)', 'Monoparental', 'Nuclear simple'],
        },
        {
          kind: 'checks',
          label: 'Problemas sociales dentro del núcleo familiar',
          cols: 3,
          options: [
            'Violencia física',
            'Violencia psicológica',
            'Violencia sexual',
            'Antecedentes penales',
            'Abandono',
            'Adicción en familiares',
            'Otros',
          ],
        },
        { kind: 'text', label: 'Observaciones', lines: 3 },
      ],
    },
    {
      title: '3. Situación económica',
      blocks: [
        {
          kind: 'table',
          columns: [
            { label: 'Ingresos mensuales', width: '30%' },
            { label: '$', width: '20%' },
            { label: 'Egresos mensuales', width: '30%' },
            { label: '$', width: '20%' },
          ],
          rows: [
            ['Entrevistado', '', 'Alimentación', ''],
            ['Esposa/o', '', 'Vivienda', ''],
            ['Padres', '', 'Educación', ''],
            ['Hijos', '', 'Salud', ''],
            ['Amigos', '', 'Servicios básicos', ''],
            ['Otros', '', 'Otros', ''],
            ['TOTAL', '', 'TOTAL', ''],
          ],
        },
      ],
    },
    {
      title: '4. Vivienda',
      blocks: [
        {
          kind: 'checks',
          label: 'Tenencia',
          cols: 5,
          options: ['Propia', 'Hipoteca', 'De padres o familiares', 'Alquilada', 'Otros'],
        },
        { kind: 'checks', label: 'Características', cols: 3, options: ['Unifamiliar', 'Multifamiliar', 'N° habitaciones: ____'] },
        { kind: 'checks', label: 'Tipo', cols: 6, options: ['Madera', 'Adobe', 'Hormigón', 'Rústico', 'Provisional', 'Mixta'] },
        { kind: 'checks', label: 'Techo', cols: 4, options: ['Teja', 'Zinc', 'Dura techo', 'Loza'] },
        {
          kind: 'checks',
          label: 'Servicios básicos',
          cols: 4,
          options: ['Agua potable', 'Agua entubada', 'Luz eléctrica', 'Alcantarillado', 'Teléfono', 'Internet', 'TV cable', 'Otros'],
        },
        {
          kind: 'checks',
          label: 'Otros patrimonios',
          cols: 3,
          options: ['Terrenos', 'Fincas', 'Lotes', 'Ganado vacuno', 'Porcino', 'Aves de corral'],
        },
      ],
    },
    { title: '5. Datos de la infancia', blocks: [{ kind: 'text', lines: 3 }] },
    { title: '6. Datos de adolescencia — juventud', blocks: [{ kind: 'text', lines: 3 }] },
    { title: '7. Situación actual', blocks: [{ kind: 'text', lines: 3 }] },
    {
      title: '8. Causas y consecuencias que genera el consumo',
      blocks: [
        { kind: 'checks', cols: 2, options: ['Alcohol', 'Drogas'] },
        { kind: 'text', label: 'Causas', lines: 3 },
        { kind: 'text', label: 'Consecuencias', lines: 3 },
      ],
    },
    {
      title: '9. Razones más importantes por las que dejaría de consumir alcohol / drogas',
      blocks: [{ kind: 'text', lines: 3 }],
    },
    { title: '10. Conclusiones', blocks: [{ kind: 'text', lines: 3 }] },
    { title: '11. Compromisos', blocks: [{ kind: 'text', lines: 3 }] },
    { blocks: [{ kind: 'signatures', signers: ['Trabajador/a social', 'Usuario interno'] }] },
  ],
}

export const SOCIAL_SEGUIMIENTO: FormTemplate = {
  id: 'social-seguimiento',
  title: 'Ficha de seguimiento social',
  sections: [
    {
      title: 'Datos de la visita',
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Usuario egresado', prefill: 'name', span: 2 },
            { label: 'Cédula', prefill: 'idCard' },
            { label: 'Carpeta N°', prefill: 'hc' },
            { label: 'Fecha', prefill: 'today' },
            { label: 'Hora', prefill: 'now' },
            { label: 'Teléfono', prefill: 'phone', span: 2 },
            { label: 'Dirección del domicilio', prefill: 'address', span: 4 },
            { label: 'Responsable de la visita', span: 4 },
          ],
        },
        { kind: 'text', label: 'Nombre de la persona o personas visitadas', lines: 2 },
        { kind: 'text', label: 'Motivo de la visita', lines: 2 },
      ],
    },
    { title: 'Diagnóstico social', blocks: [{ kind: 'text', lines: 5 }] },
    {
      title: 'Sugerencias para el plan de acompañamiento del usuario egresado y/o familia',
      blocks: [{ kind: 'text', lines: 4 }],
    },
    { title: 'Estado del usuario egresado', blocks: [{ kind: 'checks', cols: 2, options: ['Estable', 'Recaída'] }] },
    { title: 'Observaciones generales sobre la visita', blocks: [{ kind: 'text', lines: 4 }] },
    { blocks: [{ kind: 'photo', label: 'Anexos fotográficos' }] },
    {
      blocks: [{ kind: 'signatures', signers: ['Entrevistador/a — trabajador/a social', 'Entrevistado — usuario / familiar'] }],
    },
  ],
}

export const OCUPACIONAL: FormTemplate = {
  id: 'ocupacional',
  title: 'Área ocupacional',
  sections: [
    {
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Usuario', prefill: 'name', span: 2 },
            { label: 'Historia clínica', prefill: 'hc' },
            { label: 'Fecha', prefill: 'today' },
            { label: 'Profesional', span: 2 },
            { label: 'Diagnóstico', span: 2 },
          ],
        },
      ],
    },
    {
      title: 'Evaluación por criterios',
      blocks: [
        {
          kind: 'table',
          note: 'C = cumple · NC = no cumple · NA = no aplica. Marque una sola opción por fila; el total se cuenta solo.',
          rowHeight: 'md',
          radioGroup: [1, 2, 3],
          columns: [
            { label: 'Criterio', width: '46%' },
            { label: 'C', width: '6%' },
            { label: 'NC', width: '6%' },
            { label: 'NA', width: '6%' },
            { label: 'Observaciones' },
          ],
          rows: [
            'Coordinación viso-motriz: lanzar, recoger, conducir, golpear balones de distintos tamaños y pesos',
            'Equilibrio: estático y dinámico',
            'Coordinación motora gruesa: saltar la cuerda, patear, lanzar, atrapar, escalar, correr',
            'Coordinación motora fina: pinza, colorear, rasgado, plegado, encajar, recortar',
            'Atención, concentración y memoria: juegos de mesa',
            'Estimulación sensorial: musicoterapia, texturas, olfativo, propioceptivo (rondas, danzas)',
            'Estimulación visual: luces, tarjetas de estimulación visual',
            'Actividades básicas de la vida diaria: vestirse, comer, aseo personal, control de esfínteres, descanso y sueño',
            'Actividades instrumentales: tareas, uso del dinero, cuidado de mascotas, movilidad en la comunidad, compras',
            'Gestión de la comunicación: hablar por teléfono, contestar y hacer llamadas',
            'Componente perceptivo: ubicación en tiempo y espacio (día, hora, lugar)',
            'Componente cognitivo: funciones ejecutivas (planificación, decisiones, organización, inicio y fin de tareas); atención focalizada, sostenida y dividida',
            'Educación y recomendaciones a familiares o cuidadores',
            'TOTAL',
          ],
        },
      ],
    },
    { blocks: [{ kind: 'signatures', signers: ['Terapeuta ocupacional'] }] },
  ],
}
