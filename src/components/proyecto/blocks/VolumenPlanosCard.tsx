import type { FieldArrayWithId, UseFormRegister, FieldErrors } from "react-hook-form";
import { Layers, Plus, Trash2 } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { inputCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

interface Props {
  fields: FieldArrayWithId<NuevoProyectoFormValues, "laminas">[];
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function VolumenPlanosCard({ fields, register, errors, onAdd, onRemove }: Props) {
  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                 hover:bg-emerald-500/20 transition-colors duration-150"
    >
      <Plus size={13} />
      Añadir Lámina
    </button>
  );

  return (
    <FormCard
      title="Volumen de Planos"
      subtitle="Índice dinámico de láminas del proyecto"
      icon={Layers}
      iconGradient="from-emerald-500 to-teal-500"
      headerAction={addButton}
    >
      {/* Cabecera de columnas */}
      <div className="grid grid-cols-[90px_1fr_40px] gap-3 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400">
          Código
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400">
          Nombre de Lámina
        </span>
      </div>

      {/* Filas dinámicas */}
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[90px_1fr_40px] gap-3 items-center">
            <input
              {...register(`laminas.${index}.codigo`)}
              placeholder="A01"
              className={inputCls}
            />
            <input
              {...register(`laminas.${index}.nombre`)}
              placeholder="Ej: Planta Baja General"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={fields.length === 1}
              aria-label="Eliminar lámina"
              className="w-9 h-9 flex items-center justify-center rounded-lg
                         dark:text-slate-500 text-slate-400
                         hover:text-rose-400 hover:bg-rose-400/10
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors duration-150"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Errores sin índice */}
      {errors.laminas?.message && (
        <p className="text-xs text-rose-400">{errors.laminas.message}</p>
      )}
    </FormCard>
  );
}
