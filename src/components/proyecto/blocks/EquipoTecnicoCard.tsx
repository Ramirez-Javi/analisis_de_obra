import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { HardHat } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

interface Props {
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
}

export function EquipoTecnicoCard({ register, errors }: Props) {
  return (
    <FormCard
      title="Equipo Técnico"
      subtitle="Profesionales responsables del proyecto"
      icon={HardHat}
      iconGradient="from-orange-500 to-amber-500"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          label="Elaboración del Proyecto"
          error={errors.equipoElaboracion?.message}
        >
          <input
            {...register("equipoElaboracion")}
            placeholder="Arq. Nombre Apellido"
            className={inputCls}
          />
        </FormField>
        <FormField label="Planos / Digitalizador" error={errors.equipoPlanos?.message}>
          <input
            {...register("equipoPlanos")}
            placeholder="Arq. Nombre Apellido"
            className={inputCls}
          />
        </FormField>
        <FormField label="Renders / 3D" error={errors.equipoRenders?.message}>
          <input
            {...register("equipoRenders")}
            placeholder="Diseñador / Estudio"
            className={inputCls}
          />
        </FormField>
      </div>
    </FormCard>
  );
}
