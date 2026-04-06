"use client";

import { useRef, useState } from "react";
import type { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Building2, Upload, X } from "lucide-react";
import { FormCard } from "../ui/FormCard";
import { FormField } from "../ui/FormField";
import { inputCls } from "../ui/styles";
import type { NuevoProyectoFormValues } from "../types";

interface Props {
  register: UseFormRegister<NuevoProyectoFormValues>;
  errors: FieldErrors<NuevoProyectoFormValues>;
  setValue: UseFormSetValue<NuevoProyectoFormValues>;
}

export function EmpresaCard({ register, errors, setValue }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Guarda el nombre del archivo en el campo logoUrl (la carga real requiere storage)
    setValue("empresa.logoUrl", file.name, { shouldDirty: true });
  }

  function clearLogo() {
    setPreview(null);
    setValue("empresa.logoUrl", "", { shouldDirty: true });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <FormCard
      title="Datos de la Empresa"
      subtitle="Cabezalero que aparecerá en todos los informes y reportes"
      icon={Building2}
      iconGradient="from-violet-500 to-purple-600"
    >
      {/* Fila 1: Logo + Nombre + Título */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Logo upload */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div
            className="w-24 h-24 rounded-xl border-2 border-dashed dark:border-white/20 border-slate-300
                       dark:bg-slate-800/60 bg-slate-50
                       flex items-center justify-center overflow-hidden cursor-pointer
                       hover:border-violet-400 transition-colors duration-200"
            onClick={() => fileRef.current?.click()}
            title="Cargar logo de la empresa"
          >
            {preview ? (
              <img src={preview} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="flex flex-col items-center gap-1 p-2 text-center">
                <Upload size={20} className="dark:text-slate-500 text-slate-400" />
                <span className="text-[10px] leading-tight dark:text-slate-500 text-slate-400">
                  Cargar logo
                </span>
              </div>
            )}
          </div>
          {preview && (
            <button
              type="button"
              onClick={clearLogo}
              className="flex items-center gap-1 text-[11px] dark:text-red-400 text-red-500 hover:underline"
            >
              <X size={12} />
              Quitar
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>

        {/* Nombre + Título */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Nombre de la Empresa"
            required
            error={errors.empresa?.nombre?.message}
          >
            <input
              {...register("empresa.nombre", { required: "El nombre de la empresa es obligatorio" })}
              placeholder="Ej: Estudio Martínez Arquitectos"
              className={inputCls}
            />
          </FormField>
          <FormField
            label="Título / Eslogan"
            error={errors.empresa?.titulo?.message}
          >
            <input
              {...register("empresa.titulo")}
              placeholder="Ej: Diseño con precisión arquitectónica"
              className={inputCls}
            />
          </FormField>
        </div>
      </div>

      {/* Fila 2: Dirección + Teléfono */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Dirección" error={errors.empresa?.direccion?.message}>
          <input
            {...register("empresa.direccion")}
            placeholder="Ej: Av. España 1234"
            className={inputCls}
          />
        </FormField>
        <FormField label="Teléfono" error={errors.empresa?.telefono?.message}>
          <input
            {...register("empresa.telefono")}
            placeholder="Ej: +595 21 123 456"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Fila 3: Email + Web */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="E-mail" error={errors.empresa?.email?.message}>
          <input
            {...register("empresa.email")}
            type="email"
            placeholder="Ej: info@estudio.com"
            className={inputCls}
          />
        </FormField>
        <FormField label="Sitio Web" error={errors.empresa?.web?.message}>
          <input
            {...register("empresa.web")}
            placeholder="Ej: www.estudio.com"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* Fila 4: Ciudad + País */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Ciudad" error={errors.empresa?.ciudad?.message}>
          <input
            {...register("empresa.ciudad")}
            placeholder="Ej: Asunción"
            className={inputCls}
          />
        </FormField>
        <FormField label="País" error={errors.empresa?.pais?.message}>
          <input
            {...register("empresa.pais")}
            placeholder="Ej: Paraguay"
            className={inputCls}
          />
        </FormField>
      </div>
    </FormCard>
  );
}
