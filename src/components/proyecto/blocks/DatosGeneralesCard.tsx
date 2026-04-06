import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { FileText } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls, textareaCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Nombre del Proyecto" required error={errors.nombre?.message}>
          <input
            {...register("nombre", { required: "El nombre es obligatorio" })}
            placeholder="Ej: Residencia Martínez"
            className={inputCls}
          />
        </FormField>
        <FormField label="Ubicación" error={errors.ubicacion?.message}>
          <input
            {...register("ubicacion")}
            placeholder="Ej: Asunción, Paraguay"
            className={inputCls}
          />
        </FormField>
      </div>
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
