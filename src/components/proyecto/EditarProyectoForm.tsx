"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { NuevoProyectoFormValues } from "./types";
import { editarProyecto } from "@/app/proyectos/actions";
import { EmpresaCard } from "./blocks/EmpresaCard";
import { DatosGeneralesCard } from "./blocks/DatosGeneralesCard";
import { PropietariosCard } from "./blocks/PropietariosCard";
import { EquipoTecnicoCard } from "./blocks/EquipoTecnicoCard";
import { VolumenPlanosCard } from "./blocks/VolumenPlanosCard";

interface Props {
  proyectoId: string;
  defaultValues: NuevoProyectoFormValues;
}

export function EditarProyectoForm({ proyectoId, defaultValues }: Props) {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NuevoProyectoFormValues>({ defaultValues });

  const propietariosArray = useFieldArray({ control, name: "propietarios" });
  const laminasArray = useFieldArray({ control, name: "laminas" });

  const onSubmit = async (data: NuevoProyectoFormValues) => {
    const toastId = toast.loading("Guardando cambios...");
    try {
      const resultado = await editarProyecto(proyectoId, data);

      if (!resultado.ok) {
        toast.error(resultado.error, { id: toastId });
        return;
      }

      toast.success("Ficha actualizada correctamente", {
        id: toastId,
        description: "Redirigiendo a la ficha...",
        duration: 2500,
      });

      await new Promise((r) => setTimeout(r, 1000));
      router.push(`/proyectos/${proyectoId}/ficha`);
      router.refresh();
    } catch {
      toast.error("Error inesperado. Por favor intenta nuevamente.", {
        id: toastId,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <EmpresaCard register={register} errors={errors} setValue={setValue} initialLogoUrl={defaultValues.empresa.logoUrl || undefined} />

      <DatosGeneralesCard register={register} errors={errors} />

      <PropietariosCard
        fields={propietariosArray.fields}
        register={register}
        errors={errors}
        onAdd={() =>
          propietariosArray.append({ nombre: "", direccion: "", telefono: "", email: "" })
        }
        onRemove={propietariosArray.remove}
      />

      <EquipoTecnicoCard register={register} errors={errors} />

      <VolumenPlanosCard
        fields={laminasArray.fields}
        register={register}
        errors={errors}
        onAdd={() => laminasArray.append({ codigo: "", nombre: "" })}
        onRemove={laminasArray.remove}
      />

      <div className="flex justify-end pt-2 pb-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                     bg-gradient-to-r from-teal-500 to-cyan-600
                     hover:from-teal-400 hover:to-cyan-500
                     text-white shadow-lg shadow-teal-500/25
                     hover:shadow-teal-500/40 hover:-translate-y-0.5
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                     transition-all duration-200"
        >
          <Save size={16} />
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
