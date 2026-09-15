import type { FormTemplate } from './types'

/**
 * Formatos del área de Psicología del centro (no son formularios MSP numerados).
 *
 * PSICO_ENTREVISTA y PSICO_HISTORIA se llenan por separado en el sistema, cada
 * uno con sus propias preguntas como en el papel. Hasta que se separaron, la
 * historia llevaba las preguntas de la entrevista: la entrevista puede traer esas
 * respuestas (utils/formAnswers.ts → carryOverAnswers), que se emparejan por la
 * etiqueta del campo. Por eso las preguntas que venían de la historia conservan
 * aquí su redacción de entonces.
 *
 * ⚠️ Las respuestas guardadas se identifican por título de sección + etiqueta
 * (utils/formAnswers.ts): no renombrar sin migrar los datos.
 */

export const PSICO_HISTORIA: FormTemplate = {
  id: 'psico-historia',
  title: 'Historia clínica psicológica',
  sections: [
    {
      title: 'Datos de identificación',
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Residente', prefill: 'name', span: 2 },
            { label: 'N° historia clínica', prefill: 'hc' },
            { label: 'F.I. (fecha de ingreso)', prefill: 'admission' },
            { label: 'Cédula', prefill: 'idCard' },
            { label: 'Sexo', prefill: 'sex' },
            { label: 'Edad', prefill: 'age' },
            { label: 'Fecha de nacimiento', prefill: 'birthDate' },
            { label: 'Lugar de nacimiento' },
            { label: 'Procedencia' },
            { label: 'Residencia' },
            { label: 'Estado civil', prefill: 'maritalStatus' },
            { label: 'Instrucción', prefill: 'education' },
            { label: 'Religión', prefill: 'religion' },
            { label: 'Ocupación', prefill: 'occupation' },
            { label: 'Teléfono', prefill: 'phone' },
            { label: 'Domicilio', prefill: 'address', span: 2 },
            { label: 'N° de internamientos' },
            { label: 'Familiar o persona responsable' },
          ],
        },
      ],
    },
    {
      title: 'Motivo de consulta',
      blocks: [
        { kind: 'text', label: 'Motivo', hint: '¿Qué le ocurrió?, ¿desde cuándo?, ¿a qué lo atribuye?', lines: 4 },
        { kind: 'text', label: 'Condiciones físicas, cognitivas, conductuales y afectivas durante la entrevista', lines: 3 },
      ],
    },
    {
      title: 'Fuentes de información',
      blocks: [
        { kind: 'checks', label: 'Tipo de fuente', cols: 3, options: ['Directa', 'Indirecta', 'Mixta'] },
        { kind: 'text', label: 'Grado de confiabilidad y credibilidad', lines: 2 },
      ],
    },
    {
      title: 'Historia de la enfermedad',
      blocks: [{ kind: 'text', label: 'Historia', hint: 'Modo de inicio, factores desencadenantes, evolución y complicaciones.', lines: 4 }],
    },
    {
      title: 'Enfermedad actual',
      blocks: [
        {
          kind: 'text',
          label: 'Último episodio',
          hint: 'Tiempo de duración, frecuencia e intensidad (sintomatología).',
          lines: 4,
        },
      ],
    },
    {
      title: 'Hábitos y consumo',
      blocks: [
        {
          kind: 'questions',
          items: [{ label: '¿Consume otras drogas?', detail: '¿Cuáles?' }],
        },
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Edad de inicio del consumo' },
            { label: 'Sustancia de impacto' },
            { label: 'Frecuencia de consumo actual' },
            { label: 'Último consumo' },
          ],
        },
      ],
    },
    {
      title: 'Psicoanamnesis personal',
      blocks: [
        { kind: 'text', label: 'Prenatal', hint: 'Embarazo planificado y aceptado, factores estresores, relación conyugal.', lines: 2 },
        { kind: 'text', label: 'Natal', hint: 'Tipo de parto, a término o prematuro, quién lo atendió, complicaciones.', lines: 2 },
        {
          kind: 'text',
          label: 'Infancia',
          hint: 'Desarrollo psicomotor, lenguaje, control de esfínteres, enfermedades, etapa escolar, ambiente familiar y conducta.',
          lines: 3,
        },
        {
          kind: 'text',
          label: 'Adolescencia y juventud',
          hint: 'Secundaria, adaptación, relaciones con compañeros, ambiente familiar, relaciones sociales y sentimentales.',
          lines: 3,
        },
        {
          kind: 'text',
          label: 'Adultez y vejez',
          hint: 'Estudios, trabajo, matrimonio o soltería, conflictos, separaciones, hábitos y disfunciones.',
          lines: 3,
        },
      ],
    },
    {
      title: 'Psicoanamnesis familiar',
      hint: 'Tipo de familia, condiciones socioeconómicas, trabajos, patologías e interacciones.',
      blocks: [
        {
          kind: 'table',
          label: 'Núcleo familiar',
          rowHeight: 'md',
          columns: [
            { label: 'Integrante', width: '12%' },
            { label: 'Nombre', width: '22%' },
            { label: 'Edad', width: '7%' },
            { label: 'Vivo / fallecido', width: '11%' },
            { label: 'Instrucción / ocupación', width: '18%' },
            { label: 'Relación con el usuario' },
          ],
          rows: ['Padre', 'Madre', 'Hermanos', 'Pareja', 'Hijos'],
        },
        { kind: 'text', label: 'Dinámica familiar', hint: 'Tipo de familia, condiciones sociales y económicas, interacciones.', lines: 3 },
      ],
    },
    {
      title: 'Historia laboral',
      blocks: [
        { kind: 'text', label: 'Trayectoria laboral', hint: 'Inicio laboral, tipos de trabajo, duración, rendimiento, remuneración y satisfacción.', lines: 3 },
      ],
    },
    {
      title: 'Historia social',
      blocks: [
        {
          kind: 'text',
          label: 'Vida social',
          hint: 'Intereses, tiempo libre, sintonía social (buena / mala), contactos sociales (muchos / pocos), deterioro social.',
          lines: 3,
        },
      ],
    },
    {
      title: 'Historia psicosexual',
      blocks: [
        { kind: 'text', label: 'Desarrollo psicosexual', hint: 'Primera relación sexual y su valoración, conductas, disfunciones, grado de información.', lines: 3 },
      ],
    },
    {
      title: 'Patologías anteriores',
      blocks: [
        {
          kind: 'text',
          label: 'Patologías',
          hint: 'Enfermedades importantes o relacionadas: tuberculosis, diabetes, convulsiones, padecimientos neurológicos o psiquiátricos, alergias, ETS, ACV, traumatismos craneales, operaciones.',
          lines: 3,
        },
      ],
    },
    {
      title: 'Examen del estado mental',
      hint: 'Especifique la intensidad cuando aplique: leve, moderado, grave.',
      blocks: [
        {
          kind: 'table',
          label: 'Áreas evaluadas',
          rowHeight: 'md',
          columns: [{ label: 'Área', width: '26%' }, { label: 'Hallazgos' }],
          rows: [
            'Apariencia',
            'Forma de relación',
            'Estado de la conciencia',
            'Orientación',
            'Atención',
            'Memoria',
            'Lenguaje',
            'Pensamiento: curso y estructura',
            'Pensamiento: contenido',
            'Conducta motora',
            'Afectividad',
            'Sensopercepción',
            'Inteligencia',
            'Juicio',
            'Voluntad',
            'Instintos (sueño, apetito, conservación)',
          ],
        },
      ],
    },
    {
      title: 'Psicoanamnesis especial',
      blocks: [
        { kind: 'text', label: 'Factor predisponente', hint: 'Hereditario: alguien más en la familia con la misma enfermedad.', lines: 2 },
        {
          kind: 'text',
          label: 'Factor desencadenante',
          hint: 'Experiencias o traumas del pasado, maltrato o abandono, presiones de amigos o familiares.',
          lines: 2,
        },
        { kind: 'text', label: 'Factor precipitante', hint: 'Conflictos personales, sociales o laborales actuales.', lines: 2 },
      ],
    },
    {
      title: 'Resultados de test',
      blocks: [{ kind: 'testResults' }],
    },
    {
      title: 'Evaluación multiaxial',
      blocks: [
        {
          kind: 'table',
          label: 'Ejes',
          rowHeight: 'md',
          columns: [{ label: 'Eje', width: '34%' }, { label: 'Contenido' }],
          rows: [
            'Eje I — Cuadros clínicos',
            'Eje II — Personalidad, retardo mental, mecanismos de defensa',
            'Eje III — Enfermedades médicas',
            'Eje IV — Problemas psicosociales y ambientales',
            'Eje V — Actividad global',
          ],
        },
      ],
    },
    {
      title: 'Conclusiones',
      blocks: [
        {
          kind: 'text',
          label: 'Conclusiones',
          hint: 'Inferencia de la entrevista, la historia, el examen mental, la entrevista familiar, los test y la evaluación multiaxial.',
          lines: 4,
        },
      ],
    },
    {
      title: 'Recomendaciones',
      hint: 'Sugerencias para el residente y los profesionales a cargo del caso.',
      blocks: [
        { kind: 'text', label: 'Generales', lines: 3 },
        { kind: 'text', label: 'Específicas', lines: 3 },
      ],
    },
    { blocks: [{ kind: 'signatures', signers: ['Elaborado por — profesional responsable'] }] },
  ],
}

export const PSICO_ENTREVISTA: FormTemplate = {
  id: 'psico-entrevista',
  title: 'Entrevista psicológica para adultos',
  sections: [
    {
      title: 'I. Datos generales',
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Nombre completo', prefill: 'name', span: 2 },
            { label: 'Lugar y fecha de nacimiento', prefill: 'birthDate', span: 2 },
            { label: 'Nacionalidad' },
            { label: 'Sexo', prefill: 'sex' },
            { label: 'Edad', prefill: 'age' },
            { label: 'Religión', prefill: 'religion' },
            { label: 'Estado civil', prefill: 'maritalStatus' },
            { label: 'Teléfono', prefill: 'phone' },
            { label: 'Ocupación actual', prefill: 'occupation' },
            { label: 'Nivel educativo', prefill: 'education' },
            { label: 'Dirección actual', prefill: 'address', span: 4 },
            { label: 'Pasatiempos', span: 2 },
            { label: 'Deportes', span: 2 },
          ],
        },
        {
          kind: 'questions',
          items: [
            { label: '¿Posee algún apodo o sobrenombre?', detail: 'Especifique' },
            { label: '¿Fuma?', detail: '¿Cuántos al día?' },
            { label: '¿Ingiere bebidas alcohólicas?', detail: 'Especifique' },
          ],
        },
      ],
    },
    {
      title: 'II. Antecedentes clínicos y psicológicos',
      blocks: [
        {
          kind: 'questions',
          items: [
            { label: '¿Tiene alergias?', detail: '¿Cuáles?' },
            { label: '¿Toma algún medicamento regularmente?', detail: '¿Para qué?' },
            { label: '¿Ha sido intervenido quirúrgicamente?', detail: 'Especifique' },
            { label: '¿Ha sido hospitalizado?', detail: '¿Por qué?' },
          ],
        },
        { kind: 'text', label: 'Enfermedades que sufrió durante la infancia', lines: 2 },
        {
          kind: 'checks',
          label: 'Marque con X si en su vida ha presentado',
          cols: 3,
          options: [
            'Insomnio',
            'Cólico y/o diarrea tensional',
            'Comerse las uñas',
            'Hablar dormido',
            'Pesadillas',
            'Convulsiones',
            'Maltrato físico',
            'Orinarse en la noche',
            'Escucha voces',
            'Fiebre',
            'Miedos o fobias',
            'Consumo de drogas',
            'Golpes en la cabeza',
            'Ganas de morir',
            'Ver cosas extrañas',
            'Problemas de aprendizaje',
            'Mareos o desmayos',
            'Repitencias escolares',
            'Accidentes',
            'Asma',
            'Intentos suicidas',
            'Estreñimiento',
            'Tartamudez',
            'Sudoración en las manos',
            'Caminar dormido',
            'Tics nerviosos',
          ],
        },
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Edad al entrar a la escuela' },
            { label: 'Tiempo en que la cursó' },
            { label: 'Edad al entrar al colegio' },
            { label: 'Tiempo en que lo cursó' },
            { label: '¿Repitió algún año?', span: 2 },
            { label: '¿Cómo aprende más fácilmente?', span: 2 },
            { label: 'Materias que le dificultan', span: 2 },
            { label: 'Materias preferidas', span: 2 },
            { label: 'Edad del primer noviazgo', span: 2 },
            { label: 'Edad de la primera relación sexual', span: 2 },
          ],
        },
        { kind: 'text', label: 'Problemas en su tiempo escolar', lines: 2 },
        { kind: 'text', label: 'Actividades a las que se dedica en su tiempo libre', lines: 2 },
        {
          kind: 'questions',
          items: [
            { label: '¿Ha tenido dificultades con la ley?', detail: '¿De qué tipo?' },
            { label: '¿Prestó servicio militar?' },
            { label: '¿Ha sufrido alguna catástrofe natural o guerra?', detail: 'Especifique' },
          ],
        },
      ],
    },
    {
      title: 'III. Información familiar',
      blocks: [
        {
          kind: 'table',
          rowHeight: 'md',
          columns: [
            { label: '', width: '10%' },
            { label: 'Nombre' },
            { label: 'Edad', width: '8%' },
            { label: 'Vivo / muerto', width: '12%' },
            { label: 'Nivel académico', width: '16%' },
            { label: 'Ocupación actual', width: '18%' },
          ],
          rows: ['Padre', 'Madre'],
        },
        { kind: 'text', label: 'Tipo de relación que sostiene con su padre', lines: 2 },
        { kind: 'text', label: 'Tipo de relación que sostiene con su madre', lines: 2 },
        {
          kind: 'checks',
          label: 'Estado civil de sus padres',
          cols: 3,
          options: ['Casados', 'Divorciados', 'Unión libre', 'Separados', 'Nunca vivieron juntos', 'Otra situación'],
        },
        { kind: 'text', label: 'Si no son casados ni unión libre: motivo de la separación según su percepción', lines: 2 },
        {
          kind: 'grid',
          cols: 3,
          items: [
            { label: 'Hermanos varones' },
            { label: 'Hermanas mujeres' },
            { label: 'Posición en el orden de nacimiento' },
          ],
        },
        { kind: 'text', label: 'Hermano/a con quien se lleva mejor y motivo', lines: 2 },
        { kind: 'checks', label: 'Situación económica', cols: 4, options: ['Muy buena', 'Buena', 'Regular', 'Mala'] },
        { kind: 'grid', cols: 1, items: [{ label: 'Encargado/a de su crianza' }] },
        {
          kind: 'questions',
          items: [
            { label: '¿Sus padres tienen un hijo/a favorito/a?', detail: 'Nombre' },
            { label: '¿Son religiosos sus padres?', detail: 'Especifique' },
            { label: '¿Antecedentes de alcoholismo en la familia?', detail: 'Quién' },
            { label: '¿Antecedentes de maltrato físico, verbal o psicológico?', detail: 'Especifique' },
            { label: '¿Depresión u otra enfermedad mental en la familia?', detail: '¿Cuáles?' },
          ],
        },
        { kind: 'text', label: '¿Qué opina de sus padres?', lines: 2 },
        { kind: 'text', label: 'Una historia feliz o divertida vivida en familia', lines: 3 },
        { kind: 'signatures', signers: ['Psicólogo/a responsable', 'Usuario/a'] },
      ],
    },
  ],
}

export const PSICO_EVOLUCION: FormTemplate = {
  id: 'psico-evolucion',
  title: 'Hoja de evolución — atención individual',
  sections: [
    {
      blocks: [
        {
          kind: 'grid',
          cols: 4,
          items: [
            { label: 'Nombre', prefill: 'name', span: 2 },
            { label: 'H.C.', prefill: 'hc' },
            { label: 'Fecha de ingreso', prefill: 'admission' },
          ],
        },
      ],
    },
    {
      blocks: [
        {
          kind: 'table',
          rows: 12,
          rowHeight: 'lg',
          columns: [
            { label: 'Fecha', width: '13%' },
            { label: 'Proceso terapéutico' },
            { label: 'Observaciones', width: '30%' },
            { label: 'Firma', width: '14%' },
          ],
        },
      ],
    },
  ],
}
