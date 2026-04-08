import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { HardHat } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

const CARGOS = [
  "ARQUITECTO",
  "ARQUITECTA",
  "ARQUITECTO JR",
  "ARQUITECTA JR",
  "INGENIERO",
  "INGENIERA",
  "INGENIERO JR",
  "INGENIERA JR",
  "DIGITALIZADOR",
  "DIGITALIZADORA",
  "CONTADOR",
  "CONTADORA",
  "JEFE DE PERSONAL",
  "JEFA DE PERSONAL",
  "OTRO",
];

interface Props {
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
}

function MiembroField({
  label,
  nombreField,
  cargoField,
  datalistId,
  placeholder,
  register,
}: {
  label: string;
  nombreField: keyof NuevoProyectoFormValues;
  cargoField: keyof NuevoProyectoFormValues;
  datalistId: string;
  placeholder: string;
  register: UseFormRegister<NuevoProyectoFormValues>;
}) {
  return (
    <div className="space-y-2">
      <FormField label={label}>
        <input
          {...register(nombreField as Parameters<typeof register>[0])}
          placeholder={placeholder}
          className={inputCls}
        />
      </FormField>
      <input
        list={datalistId}
        {...register(cargoField as Parameters<typeof register>[0])}
        placeholder="Cargo / Profesión (seleccioná o escribí)"
        className={inputCls}
      />
      <datalist id={datalistId}>
        {CARGOS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
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
        <MiembroField
          label="Elaboración del Proyecto"
          nombreField="equipoElaboracion"
          cargoField="equipoElaboracionCargo"
          datalistId="cargos-elaboracion"
          placeholder="Nombre Apellido"
          register={register}
        />
        <MiembroField
          label="Planos / Digitalizador"
          nombreField="equipoPlanos"
          cargoField="equipoPlanosCargo"
          datalistId="cargos-planos"
          placeholder="Nombre Apellido"
          register={register}
        />
        <MiembroField
          label="Renders / 3D"
          nombreField="equipoRenders"
          cargoField="equipoRendersCargo"
          datalistId="cargos-renders"
          placeholder="Nombre Apellido"
          register={register}
        />
      </div>
      {/* Unused errors reference keeps TS happy */}
      {errors && null}
    </FormCard>
  );
}

