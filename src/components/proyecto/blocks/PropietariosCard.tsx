import type { FieldArrayWithId, UseFormRegister, FieldErrors } from "react-hook-form";
import { Users, Plus, Trash2, UserCircle } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

const MAX = 5;

interface Props {
  fields: FieldArrayWithId<NuevoProyectoFormValues, "propietarios">[];
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function PropietariosCard({ fields, register, errors, onAdd, onRemove }: Props) {
  const canAdd = fields.length < MAX;
  const canRemove = fields.length > 1;

  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      disabled={!canAdd}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 bg-violet-500/10 text-violet-400 border border-violet-500/20
                 hover:bg-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors duration-150"
    >
      <Plus size={13} />
      Añadir ({fields.length}/{MAX})
    </button>
  );

  return (
    <FormCard
      title="Propietarios"
      subtitle="Hasta 5 propietarios por proyecto"
      icon={Users}
      iconGradient="from-violet-500 to-purple-500"
      headerAction={addButton}
    >
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-xl border dark:border-white/[0.06] border-slate-100
                       dark:bg-slate-800/50 bg-slate-50 p-4 space-y-3"
          >
            {/* Fila de cabecera del propietario */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle size={15} className="dark:text-slate-500 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                  Propietario {index + 1}
                </span>
              </div>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label="Eliminar propietario"
                  className="w-7 h-7 flex items-center justify-center rounded-lg
                             dark:text-slate-500 text-slate-400
                             hover:text-rose-400 hover:bg-rose-400/10
                             transition-colors duration-150"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Nombre completo"
                error={errors.propietarios?.[index]?.nombre?.message}
              >
                <input
                  {...register(`propietarios.${index}.nombre`)}
                  placeholder="Ej: Carlos Rodríguez"
                  className={inputCls}
                />
              </FormField>
              <FormField
                label="Dirección"
                error={errors.propietarios?.[index]?.direccion?.message}
              >
                <input
                  {...register(`propietarios.${index}.direccion`)}
                  placeholder="Ej: Av. España 1234"
                  className={inputCls}
                />
              </FormField>
              <FormField
                label="Teléfono"
                error={errors.propietarios?.[index]?.telefono?.message}
              >
                <input
                  {...register(`propietarios.${index}.telefono`)}
                  placeholder="Ej: +595 981 123456"
                  className={inputCls}
                />
              </FormField>
              <FormField
                label="Email"
                error={errors.propietarios?.[index]?.email?.message}
              >
                <input
                  {...register(`propietarios.${index}.email`)}
                  type="email"
                  placeholder="Ej: carlos@email.com"
                  className={inputCls}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>
    </FormCard>
  );
}
