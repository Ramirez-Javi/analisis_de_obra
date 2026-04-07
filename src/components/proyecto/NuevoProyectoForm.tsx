"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { NuevoProyectoFormValues } from "./types";
import { defaultFormValues } from "./types";
import { crearProyecto } from "@/app/proyectos/actions";
import { EmpresaCard } from "./blocks/EmpresaCard";
import { DatosGeneralesCard } from "./blocks/DatosGeneralesCard";
import { PropietariosCard } from "./blocks/PropietariosCard";
import { EquipoTecnicoCard } from "./blocks/EquipoTecnicoCard";
import { VolumenPlanosCard } from "./blocks/VolumenPlanosCard";

export function NuevoProyectoForm() {
  const router = useRouter();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NuevoProyectoFormValues>({ defaultValues: defaultFormValues });

  const propietariosArray = useFieldArray({ control, name: "propietarios" });
  const laminasArray = useFieldArray({ control, name: "laminas" });

  const onSubmit = async (data: NuevoProyectoFormValues) => {
    const toastId = toast.loading("Guardando ficha de proyecto...");

    try {
      const resultado = await crearProyecto(data);

      if (!resultado.ok) {
        toast.error(resultado.error, { id: toastId });
        return;
      }

      toast.success(
        `Proyecto ${resultado.codigo} creado exitosamente`,
        {
          id: toastId,
          description: "Redirigiendo a Mis Proyectos...",
          duration: 3000,
        }
      );

      // Pequeña pausa para que el usuario vea el toast antes de navegar
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Error inesperado. Por favor intenta nuevamente.", {
        id: toastId,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <EmpresaCard register={register} errors={errors} setValue={setValue} />

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

      {/* Footer de acción */}
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
          {isSubmitting ? "Guardando..." : "Guardar Ficha de Proyecto"}
        </button>
      </div>
    </form>
  );
}
