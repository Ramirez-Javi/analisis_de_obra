import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { FileText } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls, selectCls, textareaCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

const ESTADOS: { value: string; label: string }[] = [
  { value: "ANTEPROYECTO",        label: "Anteproyecto" },
  { value: "BORRADOR",            label: "Borrador" },
  { value: "PROYECTO_EJECUTIVO",  label: "Proyecto Ejecutivo" },
  { value: "CONTRATO_CONFIRMADO", label: "Contrato Confirmado" },
  { value: "EN_EJECUCION",        label: "En Ejecución" },
  { value: "PAUSADO",             label: "Pausado" },
  { value: "FINALIZADO",          label: "Finalizado" },
  { value: "OTRO",                label: "Otro" },
];

interface Props {
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
}

export function DatosGeneralesCard({ register, errors }: Props) {
  return (
    <FormCard
      title="Datos Generales"
      subtitle="Información principal del proyecto"
      icon={FileText}
      iconGradient="from-blue-500 to-cyan-500"
    >
      {/* Nombre + Código */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Nombre del Proyecto" required error={errors.nombre?.message}>
          <input
            {...register("nombre", { required: "El nombre es obligatorio" })}
            placeholder="Ej: Residencia Martínez"
            className={inputCls}
          />
        </FormField>
        <FormField label="Código de Obra" required error={errors.codigo?.message}>
          <input
            {...register("codigo", { required: "El código es obligatorio" })}
            placeholder="Ej: GTZ-01-2026"
            className={inputCls}
          />
          <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">
            Código único definido por tu empresa o estudio (Ej: GTZ-01-2026).
          </p>
        </FormField>
      </div>

      {/* Ubicación + Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Ubicación" error={errors.ubicacion?.message}>
          <input
            {...register("ubicacion")}
            placeholder="Ej: Asunción, Paraguay"
            className={inputCls}
          />
        </FormField>
        <FormField label="Estado del Proyecto" error={errors.estado?.message}>
          <select {...register("estado")} className={selectCls}>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Fecha de inicio + Duración */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Fecha de Inicio del Proyecto" error={errors.fechaInicio?.message}>
          <input
            type="date"
            {...register("fechaInicio")}
            className={inputCls}
          />
        </FormField>
        <FormField label="Duración de la Obra (semanas)" error={errors.duracionSemanas?.message}>
          <input
            type="number"
            min={1}
            max={520}
            {...register("duracionSemanas")}
            placeholder="Ej: 24"
            className={inputCls}
          />
          <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">
            La fecha de finalización se define en el Cronograma de Avance.
          </p>
        </FormField>
      </div>

      {/* Superficie m² */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Superficie a Construir (m²)" error={errors.superficieM2?.message}>
          <input
            type="number"
            min={1}
            step="0.01"
            {...register("superficieM2")}
            placeholder="Ej: 192"
            className={inputCls}
          />
          <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">
            Área construible. Se usa para calcular el Costo/m² en el Presupuesto.
          </p>
        </FormField>
        <FormField label="Superficie del Terreno (m²)" error={errors.superficieTerreno?.message}>
          <input
            type="number"
            min={1}
            step="0.01"
            {...register("superficieTerreno")}
            placeholder="Ej: 400"
            className={inputCls}
          />
          <p className="text-[11px] dark:text-slate-500 text-slate-400 mt-1">
            Área total del terreno o lote.
          </p>
        </FormField>
      </div>

      {/* Descripción */}
      <FormField label="Descripción / Detalles Estratégicos" error={errors.descripcion?.message}>
        <textarea
          {...register("descripcion")}
          rows={3}
          placeholder="Descripción general del proyecto, objetivos y notas estratégicas..."
          className={textareaCls}
        />
      </FormField>
    </FormCard>
  );
}
