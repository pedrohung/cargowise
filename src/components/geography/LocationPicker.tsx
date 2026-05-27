import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  municipalitiesQueryOptions,
  provincesQueryOptions,
} from "@/hooks/useGeography";

interface Props {
  provinceId: string | null;
  municipalityId: string | null;
  onChange: (next: { provinceId: string | null; municipalityId: string | null }) => void;
  disabled?: boolean;
}

export function LocationPicker({ provinceId, municipalityId, onChange, disabled }: Props) {
  const { data: provinces } = useSuspenseQuery(provincesQueryOptions);
  const { data: municipalities } = useSuspenseQuery(municipalitiesQueryOptions);

  const [provOpen, setProvOpen] = useState(false);
  const [muniOpen, setMuniOpen] = useState(false);

  const province = provinces.find((p) => p.id === provinceId) ?? null;
  const municipality = municipalities.find((m) => m.id === municipalityId) ?? null;

  const filteredMunis = useMemo(
    () => (provinceId ? municipalities.filter((m) => m.province_id === provinceId) : []),
    [municipalities, provinceId],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Popover open={provOpen} onOpenChange={setProvOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="justify-between font-normal"
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {province ? province.name : "Provincia…"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder="Buscar provincia…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {provinces.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={p.name}
                    onSelect={() => {
                      onChange({ provinceId: p.id, municipalityId: null });
                      setProvOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        provinceId === p.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {p.name}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {p.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={muniOpen} onOpenChange={setMuniOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled || !provinceId}
            className="justify-between font-normal"
          >
            <span className="truncate">
              {municipality
                ? municipality.name
                : provinceId
                ? "Municipio…"
                : "Selecciona provincia primero"}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder="Buscar municipio…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {filteredMunis.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      onChange({ provinceId, municipalityId: m.id });
                      setMuniOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        municipalityId === m.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {m.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
