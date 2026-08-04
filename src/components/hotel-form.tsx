import { CalendarIcon, ChevronDown, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  accessPermissionOptions,
  formatDate,
  type AccessPermission,
  type Contact,
} from "@/lib/hotel-profile";

export function Section({
  code,
  title,
  subtitle,
  disabled,
  children,
}: {
  code: string;
  title: string;
  subtitle: string;
  disabled?: boolean | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card-elevated overflow-hidden", disabled && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-3 border-b bg-surface/60 px-4 py-3.5">
        <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-primary">
          {code}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  disabled,
  hint,
  readOnly,
}: {
  label: string;
  value?: Date | undefined;
  onChange: (d?: Date | undefined) => void;
  disabled?: ((date: Date) => boolean) | undefined;
  hint?: string | undefined;
  readOnly?: boolean | undefined;
}) {
  return (
    <Field label={label} hint={hint}>
      <Popover>
        <PopoverTrigger asChild disabled={readOnly}>
          <Button
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0" />
            <span className="truncate">{value ? formatDate(value) : "เลือกวันที่"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} disabled={disabled} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function PermissionSelect({
  value,
  onChange,
}: {
  value: AccessPermission[];
  onChange: (next: AccessPermission[]) => void;
}) {
  const labels = accessPermissionOptions
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);

  return (
    <Field label="สิทธิ์ในการเข้าถึง" hint="เลือกได้มากกว่า 1 หมวด">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className={cn("truncate", !labels.length && "text-muted-foreground")}>
              {labels.length ? labels.join(", ") : "เลือกหมวดสิทธิ์"}
            </span>
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[19rem] p-1.5">
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {accessPermissionOptions.map((o) => {
              const on = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
                  }
                  className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-muted"
                >
                  <Checkbox checked={on} className="mt-0.5 pointer-events-none" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.detail}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export function ContactFields({
  contact,
  onChange,
  onRemove,
  title,
}: {
  contact: Contact;
  onChange: (next: Partial<Contact>) => void;
  onRemove?: (() => void) | undefined;
  title: string;
}) {
  return (
    <div className="rounded-lg border bg-surface/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="ลบผู้ติดต่อ"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="ชื่อ-สกุล">
          <Input
            value={contact.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            maxLength={120}
          />
        </Field>
        <Field label="ชื่อเล่น">
          <Input
            value={contact.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
            maxLength={40}
          />
        </Field>
        <Field label="ตำแหน่ง">
          <Input
            value={contact.position}
            onChange={(e) => onChange({ position: e.target.value })}
            maxLength={80}
          />
        </Field>
        <Field label="โทรศัพท์">
          <Input
            type="tel"
            value={contact.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            maxLength={20}
          />
        </Field>
        <Field label="อีเมล์">
          <Input
            type="email"
            value={contact.email}
            onChange={(e) => onChange({ email: e.target.value })}
            maxLength={255}
          />
        </Field>
        <PermissionSelect
          value={contact.permissions}
          onChange={(permissions) => onChange({ permissions })}
        />
      </div>
    </div>
  );
}
