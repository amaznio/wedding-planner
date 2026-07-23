"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type GuestGender = "female" | "male" | "other" | "prefer_not_to_say";
type GuestAgeCategory = "adult" | "teen" | "child" | "small_child" | "toddler_0_2";
type RelationshipMode = "none" | "with_partner";
type RelationshipType = "partner" | "plus_one";
type RelationshipGuestMode = "existing" | "new";
type WeddingEventType = "wedding" | "afterparty" | "bachelorette" | "bachelor" | "other";

type ExistingGuestOption = {
  id: string;
  name: string;
};

type EventOption = {
  id: string;
  label: string;
};

type ChildGuestInput = {
  id: string;
  firstName: string;
  lastName: string;
  isChild: true;
  ageCategory: Exclude<GuestAgeCategory, "adult">;
  needsSeat: boolean;
};

export type AddGuestFormPayload = {
  mainGuest: {
    firstName: string;
    lastName: string;
    gender?: GuestGender;
    ageCategory: GuestAgeCategory;
    eventIds: string[];
  };
  relationship:
    | { type: "none" }
    | {
        type: RelationshipType;
        existingGuestId?: string;
        newGuest?: {
          firstName: string;
          lastName: string;
          gender?: GuestGender;
          ageCategory: GuestAgeCategory;
          eventIds: string[];
        };
      };
  children: Array<{
    firstName: string;
    lastName: string;
    isChild: true;
    ageCategory: Exclude<GuestAgeCategory, "adult">;
    needsSeat: boolean;
    eventIds: string[];
  }>;
};

type AddGuestDialogProps = {
  weddingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingGuests: ExistingGuestOption[];
  availableEvents: Array<{ id: string; name: string; type: WeddingEventType }>;
  onCreated: () => void;
};

type CreatedGuest = {
  id: string;
  name: string;
};

function createChildDraft(): ChildGuestInput {
  return {
    id: `child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    firstName: "",
    lastName: "",
    isChild: true,
    ageCategory: "child",
    needsSeat: true,
  };
}

function getInitialSelectedEventIds(availableEvents: Array<{ id: string; type: WeddingEventType }>): string[] {
  const weddingEvent = availableEvents.find((event) => event.type === "wedding");
  if (weddingEvent) return [weddingEvent.id];
  const firstEvent = availableEvents[0];
  if (firstEvent) return [firstEvent.id];
  return [];
}

function mapGenderToApiSex(gender?: GuestGender): "female" | "male" | "unknown" {
  if (gender === "female") return "female";
  if (gender === "male") return "male";
  return "unknown";
}

function getInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName.trim()[0] ?? "";
  const lastInitial = lastName.trim()[0] ?? "";
  const combined = `${firstInitial}${lastInitial}`.trim();
  if (combined.length > 0) return combined.toUpperCase();
  return "??";
}

export function AddGuestDialog({
  weddingId,
  open,
  onOpenChange,
  existingGuests,
  availableEvents,
  onCreated,
}: AddGuestDialogProps) {
  const { t } = useI18n();

  const [isMobile, setIsMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainFirstName, setMainFirstName] = useState("");
  const [mainLastName, setMainLastName] = useState("");
  const [mainGender, setMainGender] = useState<GuestGender | undefined>("female");
  const [mainAgeCategory, setMainAgeCategory] = useState<GuestAgeCategory>("adult");
  const [relationshipMode, setRelationshipMode] = useState<RelationshipMode>("none");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("partner");
  const [relationshipGuestMode, setRelationshipGuestMode] = useState<RelationshipGuestMode>("existing");
  const [linkedGuestSearch, setLinkedGuestSearch] = useState("");
  const [selectedExistingGuestId, setSelectedExistingGuestId] = useState<string | null>(null);
  const [linkedFirstName, setLinkedFirstName] = useState("");
  const [linkedLastName, setLinkedLastName] = useState("");
  const [linkedGender, setLinkedGender] = useState<GuestGender | undefined>("female");
  const [linkedAgeCategory, setLinkedAgeCategory] = useState<GuestAgeCategory>("adult");
  const [children, setChildren] = useState<ChildGuestInput[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>(getInitialSelectedEventIds(availableEvents));
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const eventOptions = useMemo<EventOption[]>(() => {
    return availableEvents.map((event) => ({
      id: event.id,
      label: event.name,
    }));
  }, [availableEvents]);

  const selectedEventOptions = useMemo(
    () => eventOptions.filter((option) => selectedEventIds.includes(option.id)),
    [eventOptions, selectedEventIds],
  );

  const persistableEventIds = useMemo(() => selectedEventOptions.map((option) => option.id), [selectedEventOptions]);

  const selectedExistingGuest = useMemo(
    () => existingGuests.find((guest) => guest.id === selectedExistingGuestId) ?? null,
    [existingGuests, selectedExistingGuestId],
  );

  const filteredExistingGuests = useMemo(() => {
    const query = linkedGuestSearch.trim().toLowerCase();
    if (!query) return [];
    return existingGuests.filter((guest) => guest.name.toLowerCase().includes(query));
  }, [existingGuests, linkedGuestSearch]);
  const hasLinkedGuestQuery = linkedGuestSearch.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobile(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  const previewRelationship = useMemo(() => {
    if (relationshipMode === "none") return t("weddingGuestsPage.addGuest.relationship.none");
    const relationshipTypeLabel = relationshipType === "partner"
      ? t("weddingGuestsPage.addGuest.relationship.types.partner")
      : t("weddingGuestsPage.addGuest.relationship.types.plusOne");
    if (relationshipGuestMode === "existing" && selectedExistingGuest) {
      return `${relationshipTypeLabel}: ${selectedExistingGuest.name}`;
    }
    if (relationshipGuestMode === "new" && (linkedFirstName.trim() || linkedLastName.trim())) {
      return `${relationshipTypeLabel}: ${linkedFirstName.trim()} ${linkedLastName.trim()}`.trim();
    }
    return relationshipTypeLabel;
  }, [
    linkedFirstName,
    linkedLastName,
    relationshipGuestMode,
    relationshipMode,
    relationshipType,
    selectedExistingGuest,
    t,
  ]);

  const previewChildren = useMemo(() => {
    if (children.length === 0) return t("weddingGuestsPage.addGuest.preview.noChildren");
    const seatCount = children.filter((child) => child.needsSeat).length;
    return t("weddingGuestsPage.addGuest.preview.childrenCount", {
      count: children.length,
      seats: seatCount,
    });
  }, [children, t]);

  const previewEvents = useMemo(() => {
    if (selectedEventOptions.length === 0) return t("weddingGuestsPage.addGuest.preview.noEvents");
    return selectedEventOptions.map((option) => option.label).join(", ");
  }, [selectedEventOptions, t]);

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!mainFirstName.trim()) {
      errors.mainFirstName = t("weddingGuestsPage.addGuest.validation.firstNameRequired");
    }
    if (!mainLastName.trim()) {
      errors.mainLastName = t("weddingGuestsPage.addGuest.validation.lastNameRequired");
    }

    if (relationshipMode === "with_partner") {
      if (relationshipGuestMode === "existing") {
        if (!selectedExistingGuestId) {
          errors.relationshipGuest = t("weddingGuestsPage.addGuest.validation.relationshipGuestRequired");
        }
      } else {
        if (!linkedFirstName.trim()) {
          errors.linkedFirstName = t("weddingGuestsPage.addGuest.validation.firstNameRequired");
        }
        if (!linkedLastName.trim()) {
          errors.linkedLastName = t("weddingGuestsPage.addGuest.validation.lastNameRequired");
        }
      }
    }

    for (const child of children) {
      if (!child.firstName.trim()) {
        errors[`child-${child.id}-firstName`] = t("weddingGuestsPage.addGuest.validation.firstNameRequired");
      }
      if (!child.lastName.trim()) {
        errors[`child-${child.id}-lastName`] = t("weddingGuestsPage.addGuest.validation.lastNameRequired");
      }
    }

    return errors;
  };

  const buildPayload = (): AddGuestFormPayload => {
    return {
      mainGuest: {
        firstName: mainFirstName.trim(),
        lastName: mainLastName.trim(),
        gender: mainGender,
        ageCategory: mainAgeCategory,
        eventIds: persistableEventIds,
      },
      relationship:
        relationshipMode === "none"
          ? { type: "none" }
          : relationshipGuestMode === "existing"
            ? {
                type: relationshipType,
                existingGuestId: selectedExistingGuestId ?? undefined,
              }
            : {
                type: relationshipType,
                newGuest: {
                  firstName: linkedFirstName.trim(),
                  lastName: linkedLastName.trim(),
                  gender: linkedGender,
                  ageCategory: linkedAgeCategory,
                  eventIds: persistableEventIds,
                },
              },
      children: children.map((child) => ({
        firstName: child.firstName.trim(),
        lastName: child.lastName.trim(),
        isChild: true,
        ageCategory: child.ageCategory,
        needsSeat: child.needsSeat,
        eventIds: persistableEventIds,
      })),
    };
  };

  const createGuest = async (
    input: {
      firstName: string;
      lastName: string;
      gender?: GuestGender;
      ageCategory: GuestAgeCategory;
      guardianGuestId?: string | null;
    },
  ): Promise<CreatedGuest> => {
    const response = await fetch(`/api/weddings/${weddingId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${input.firstName} ${input.lastName}`.trim(),
        sex: mapGenderToApiSex(input.gender),
        ageCategory: input.ageCategory,
        guardianGuestId: input.guardianGuestId ?? null,
      }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string; guest?: CreatedGuest } | null;
    if (!response.ok || !json?.guest) {
      throw new Error(json?.error ?? "create_guest_failed");
    }
    return json.guest;
  };

  const assignEvents = async (guestId: string, eventIds: string[], requiresSeat = true): Promise<void> => {
    if (eventIds.length === 0) return;
    await Promise.all(
      eventIds.map(async (eventId) => {
        const response = await fetch(`/api/weddings/${weddingId}/events/${eventId}/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestId,
            invitationStatus: "invited",
            rsvpStatus: "unknown",
            requiresSeat,
          }),
        });
        if (!response.ok) {
          const json = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(json?.error ?? "assign_event_failed");
        }
      }),
    );
  };

  const rollbackCreatedGuests = async (guestIds: string[]) => {
    await Promise.allSettled(
      guestIds.map((guestId) => fetch(`/api/weddings/${weddingId}/guests/${guestId}`, { method: "DELETE" })),
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = buildPayload();
    setIsSubmitting(true);

    const createdGuestIds: string[] = [];
    try {
      const mainGuest = await createGuest(payload.mainGuest);
      createdGuestIds.push(mainGuest.id);
      await assignEvents(mainGuest.id, payload.mainGuest.eventIds, true);

      if (payload.relationship.type !== "none") {
        if (payload.relationship.existingGuestId) {
          await assignEvents(payload.relationship.existingGuestId, payload.mainGuest.eventIds, true);
        }

        if (payload.relationship.newGuest) {
          const linkedGuest = await createGuest(payload.relationship.newGuest);
          createdGuestIds.push(linkedGuest.id);
          await assignEvents(linkedGuest.id, payload.relationship.newGuest.eventIds, true);
        }

        // TODO: Persist relationship metadata (`partner` vs `plus_one`) when wedding-level relationship APIs exist.
      }

      for (const child of payload.children) {
        const childGuest = await createGuest({
          firstName: child.firstName,
          lastName: child.lastName,
          ageCategory: child.ageCategory,
          guardianGuestId: mainGuest.id,
        });
        createdGuestIds.push(childGuest.id);
        await assignEvents(childGuest.id, child.eventIds, child.needsSeat);
      }

      // TODO: Persist explicit child metadata (`isChild`) when guest-level child fields or household-role wiring is added.

      toast({
        title: t("toasts.success"),
        description: t("weddingGuestsPage.addGuest.submitSuccess"),
      });
      onOpenChange(false);
      onCreated();
    } catch (submitError) {
      await rollbackCreatedGuests(createdGuestIds);
      toast({
        title: t("toasts.info"),
        description: submitError instanceof Error ? submitError.message : t("weddingGuestsPage.addGuest.submitError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDialogBody = () => (
    <div className="flex h-full min-h-0 flex-col">
      <DialogHeader className="border-b border-zinc-200 px-6 py-4">
        <DialogTitle>{t("weddingGuestsPage.addGuest.title")}</DialogTitle>
        <DialogDescription>{t("weddingGuestsPage.addGuest.description")}</DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1">
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <form id="add-guest-form" className="flex flex-col gap-0 p-6" onSubmit={handleSubmit}>
            <section className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-zinc-900">{t("weddingGuestsPage.addGuest.basicDetails")}</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="add-guest-main-first-name" className="text-sm font-medium text-zinc-800">
                    {t("weddingGuestsPage.addGuest.firstName")}
                  </label>
                  <Input
                    id="add-guest-main-first-name"
                    value={mainFirstName}
                    onChange={(event) => setMainFirstName(event.target.value)}
                    placeholder={t("weddingGuestsPage.addGuest.firstNamePlaceholder")}
                    aria-invalid={Boolean(formErrors.mainFirstName)}
                  />
                  {formErrors.mainFirstName ? <p className="text-xs text-red-600">{formErrors.mainFirstName}</p> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="add-guest-main-last-name" className="text-sm font-medium text-zinc-800">
                    {t("weddingGuestsPage.addGuest.lastName")}
                  </label>
                  <Input
                    id="add-guest-main-last-name"
                    value={mainLastName}
                    onChange={(event) => setMainLastName(event.target.value)}
                    placeholder={t("weddingGuestsPage.addGuest.lastNamePlaceholder")}
                    aria-invalid={Boolean(formErrors.mainLastName)}
                  />
                  {formErrors.mainLastName ? <p className="text-xs text-red-600">{formErrors.mainLastName}</p> : null}
                </div>
              </div>
              <div className="flex max-w-sm flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-800">{t("weddingGuestsPage.addGuest.gender")}</label>
                <Select
                  value={mainGender ?? ""}
                  onValueChange={(value) => setMainGender(value as GuestGender)}
                >
                  <SelectTrigger aria-label={t("weddingGuestsPage.addGuest.gender")}>
                    <SelectValue placeholder={t("weddingGuestsPage.addGuest.genderPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">{t("weddingGuestsPage.addGuest.genders.female")}</SelectItem>
                    <SelectItem value="male">{t("weddingGuestsPage.addGuest.genders.male")}</SelectItem>
                    <SelectItem value="other">{t("weddingGuestsPage.addGuest.genders.other")}</SelectItem>
                    <SelectItem value="prefer_not_to_say">{t("weddingGuestsPage.addGuest.genders.preferNotToSay")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex max-w-sm flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-800">Age group</label>
                <Select value={mainAgeCategory} onValueChange={(value) => setMainAgeCategory(value as GuestAgeCategory)}>
                  <SelectTrigger aria-label={t("guestPanel.ageCategory")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult (18+)</SelectItem>
                    <SelectItem value="teen">Teen (13-17)</SelectItem>
                    <SelectItem value="child">Child (6-12)</SelectItem>
                    <SelectItem value="small_child">Small child (3-5)</SelectItem>
                    <SelectItem value="toddler_0_2">Toddler / infant (0-2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>
            <Separator className="my-4" />

            <section className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-zinc-900">{t("weddingGuestsPage.addGuest.relationship.title")}</h3>
                <p className="text-sm text-zinc-600">{t("weddingGuestsPage.addGuest.relationship.question")}</p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  type="button"
                  variant={relationshipMode === "none" ? "primary" : "outline"}
                  className="justify-start"
                  onClick={() => setRelationshipMode("none")}
                >
                  {t("weddingGuestsPage.addGuest.relationship.none")}
                </Button>
                <Button
                  type="button"
                  variant={relationshipMode === "with_partner" ? "primary" : "outline"}
                  className="justify-start"
                  onClick={() => setRelationshipMode("with_partner")}
                >
                  {t("weddingGuestsPage.addGuest.relationship.withPartner")}
                </Button>
              </div>

              {relationshipMode === "with_partner" ? (
                <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-zinc-800">
                        {t("weddingGuestsPage.addGuest.relationship.typeLabel")}
                      </label>
                      <Select
                        value={relationshipType}
                        onValueChange={(value) => setRelationshipType(value as RelationshipType)}
                      >
                        <SelectTrigger aria-label={t("weddingGuestsPage.addGuest.relationship.typeLabel")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="partner">{t("weddingGuestsPage.addGuest.relationship.types.partner")}</SelectItem>
                          <SelectItem value="plus_one">{t("weddingGuestsPage.addGuest.relationship.types.plusOne")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={relationshipGuestMode === "existing" ? "primary" : "outline"}
                        onClick={() => setRelationshipGuestMode("existing")}
                      >
                        {t("weddingGuestsPage.addGuest.relationship.searchExisting")}
                      </Button>
                      <Button
                        type="button"
                        variant={relationshipGuestMode === "new" ? "primary" : "outline"}
                        onClick={() => setRelationshipGuestMode("new")}
                      >
                        {t("weddingGuestsPage.addGuest.relationship.addNew")}
                      </Button>
                    </div>

                    {relationshipGuestMode === "existing" ? (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={linkedGuestSearch}
                          onChange={(event) => setLinkedGuestSearch(event.target.value)}
                          placeholder={t("weddingGuestsPage.addGuest.relationship.searchExistingPlaceholder")}
                        />
                        {!hasLinkedGuestQuery ? (
                          <p className="px-2 py-1 text-sm text-zinc-500">
                            {t("weddingGuestsPage.addGuest.relationship.searchHint")}
                          </p>
                        ) : (
                          <div className="h-48 overflow-y-auto overscroll-contain rounded-md border border-zinc-200">
                            <div className="flex flex-col gap-1 p-2">
                              {filteredExistingGuests.map((guest) => (
                                <Button
                                  key={guest.id}
                                  type="button"
                                  variant={selectedExistingGuestId === guest.id ? "primary" : "ghost"}
                                  className="justify-start"
                                  onClick={() => setSelectedExistingGuestId(guest.id)}
                                >
                                  {guest.name}
                                </Button>
                              ))}
                              {filteredExistingGuests.length === 0 ? (
                                <p className="px-2 py-1 text-sm text-zinc-500">{t("weddingGuestsPage.addGuest.relationship.noGuestMatch")}</p>
                              ) : null}
                            </div>
                          </div>
                        )}
                        {formErrors.relationshipGuest ? (
                          <p className="text-xs text-red-600">{formErrors.relationshipGuest}</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-zinc-800">
                            {t("weddingGuestsPage.addGuest.firstName")}
                          </label>
                          <Input
                            value={linkedFirstName}
                            onChange={(event) => setLinkedFirstName(event.target.value)}
                            placeholder={t("weddingGuestsPage.addGuest.firstNamePlaceholder")}
                            aria-invalid={Boolean(formErrors.linkedFirstName)}
                          />
                          {formErrors.linkedFirstName ? (
                            <p className="text-xs text-red-600">{formErrors.linkedFirstName}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-zinc-800">
                            {t("weddingGuestsPage.addGuest.lastName")}
                          </label>
                          <Input
                            value={linkedLastName}
                            onChange={(event) => setLinkedLastName(event.target.value)}
                            placeholder={t("weddingGuestsPage.addGuest.lastNamePlaceholder")}
                            aria-invalid={Boolean(formErrors.linkedLastName)}
                          />
                          {formErrors.linkedLastName ? (
                            <p className="text-xs text-red-600">{formErrors.linkedLastName}</p>
                          ) : null}
                        </div>
                        <div className="flex max-w-sm flex-col gap-1.5 md:col-span-2">
                          <label className="text-sm font-medium text-zinc-800">
                            {t("weddingGuestsPage.addGuest.gender")}
                          </label>
                          <Select
                            value={linkedGender ?? ""}
                            onValueChange={(value) => setLinkedGender(value as GuestGender)}
                          >
                            <SelectTrigger aria-label={t("weddingGuestsPage.addGuest.gender")}>
                              <SelectValue placeholder={t("weddingGuestsPage.addGuest.genderPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="female">{t("weddingGuestsPage.addGuest.genders.female")}</SelectItem>
                              <SelectItem value="male">{t("weddingGuestsPage.addGuest.genders.male")}</SelectItem>
                              <SelectItem value="other">{t("weddingGuestsPage.addGuest.genders.other")}</SelectItem>
                              <SelectItem value="prefer_not_to_say">{t("weddingGuestsPage.addGuest.genders.preferNotToSay")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex max-w-sm flex-col gap-1.5 md:col-span-2">
                          <label className="text-sm font-medium text-zinc-800">Age group</label>
                          <Select
                            value={linkedAgeCategory}
                            onValueChange={(value) => setLinkedAgeCategory(value as GuestAgeCategory)}
                          >
                            <SelectTrigger aria-label={t("guestPanel.ageCategory")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adult">Adult (18+)</SelectItem>
                              <SelectItem value="teen">Teen (13-17)</SelectItem>
                              <SelectItem value="child">Child (6-12)</SelectItem>
                              <SelectItem value="small_child">Small child (3-5)</SelectItem>
                              <SelectItem value="toddler_0_2">Toddler / infant (0-2)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
            <Separator className="my-4" />

            <section className="flex flex-col gap-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-zinc-900">{t("weddingGuestsPage.addGuest.children.title")}</h3>
                  <p className="text-sm text-zinc-600">{t("weddingGuestsPage.addGuest.children.description")}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setChildren((prev) => [...prev, createChildDraft()])}>
                  <Plus className="size-4" />
                  {t("weddingGuestsPage.addGuest.children.addChild")}
                </Button>
              </div>

              {children.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("weddingGuestsPage.addGuest.children.empty")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {children.map((child) => (
                    <div key={child.id} className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_220px_auto_auto] md:items-end">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-zinc-800">
                            {t("weddingGuestsPage.addGuest.firstName")}
                          </label>
                          <Input
                            value={child.firstName}
                            onChange={(event) => {
                              const value = event.target.value;
                              setChildren((prev) =>
                                prev.map((item) => (item.id === child.id ? { ...item, firstName: value } : item)),
                              );
                            }}
                            placeholder={t("weddingGuestsPage.addGuest.firstNamePlaceholder")}
                            aria-invalid={Boolean(formErrors[`child-${child.id}-firstName`])}
                          />
                          {formErrors[`child-${child.id}-firstName`] ? (
                            <p className="text-xs text-red-600">{formErrors[`child-${child.id}-firstName`]}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-zinc-800">
                            {t("weddingGuestsPage.addGuest.lastName")}
                          </label>
                          <Input
                            value={child.lastName}
                            onChange={(event) => {
                              const value = event.target.value;
                              setChildren((prev) =>
                                prev.map((item) => (item.id === child.id ? { ...item, lastName: value } : item)),
                              );
                            }}
                            placeholder={t("weddingGuestsPage.addGuest.lastNamePlaceholder")}
                            aria-invalid={Boolean(formErrors[`child-${child.id}-lastName`])}
                          />
                          {formErrors[`child-${child.id}-lastName`] ? (
                            <p className="text-xs text-red-600">{formErrors[`child-${child.id}-lastName`]}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-zinc-800">Age group</label>
                          <Select
                            value={child.ageCategory}
                            onValueChange={(value) => {
                              setChildren((prev) =>
                                prev.map((item) =>
                                  item.id === child.id
                                    ? {
                                        ...item,
                                        ageCategory: value as Exclude<GuestAgeCategory, "adult">,
                                      }
                                    : item,
                                ),
                              );
                            }}
                          >
                            <SelectTrigger aria-label={t("guestPanel.ageCategory")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="teen">Teen (13-17)</SelectItem>
                              <SelectItem value="child">Child (6-12)</SelectItem>
                              <SelectItem value="small_child">Small child (3-5)</SelectItem>
                              <SelectItem value="toddler_0_2">Toddler / infant (0-2)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Badge variant="secondary">{t("weddingGuestsPage.addGuest.children.childBadge")}</Badge>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("weddingGuestsPage.addGuest.children.remove")}
                          onClick={() => setChildren((prev) => prev.filter((item) => item.id !== child.id))}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <label className="inline-flex items-center gap-2 text-sm text-zinc-800">
                        <Checkbox
                          checked={child.needsSeat}
                          onCheckedChange={(checked) => {
                            setChildren((prev) =>
                              prev.map((item) =>
                                item.id === child.id ? { ...item, needsSeat: checked === true } : item,
                              ),
                            );
                          }}
                        />
                        <span>{t("weddingGuestsPage.addGuest.children.needsSeat")}</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <Separator className="my-4" />

            <section className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-zinc-900">{t("weddingGuestsPage.addGuest.events.title")}</h3>
                <p className="text-sm text-zinc-600">{t("weddingGuestsPage.addGuest.events.description")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {eventOptions.length === 0 ? (
                  <p className="text-sm text-zinc-500">{t("weddingGuestsPage.addGuest.preview.noEvents")}</p>
                ) : null}
                {eventOptions.map((eventOption) => {
                  const checked = selectedEventIds.includes(eventOption.id);
                  return (
                    <label
                      key={eventOption.id}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                        checked
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-zinc-200 bg-white text-zinc-700",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          setSelectedEventIds((prev) => {
                            if (value === true) return [...prev, eventOption.id];
                            return prev.filter((eventId) => eventId !== eventOption.id);
                          });
                        }}
                      />
                      <span>{eventOption.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </form>
        </ScrollArea>

        <aside className="hidden w-[300px] shrink-0 border-l border-zinc-200 p-4 xl:block">
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
            <h3 className="text-base font-semibold text-zinc-900">{t("weddingGuestsPage.addGuest.preview.title")}</h3>
            <div className="flex items-center gap-3">
              <div className="inline-flex size-12 items-center justify-center rounded-full bg-violet-100 text-base font-semibold text-violet-700">
                {getInitials(mainFirstName, mainLastName)}
              </div>
              <p className="text-sm font-medium text-zinc-900">
                {mainFirstName.trim() || mainLastName.trim()
                  ? `${mainFirstName.trim()} ${mainLastName.trim()}`.trim()
                  : t("weddingGuestsPage.addGuest.preview.noName")}
              </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="font-medium">{t("weddingGuestsPage.addGuest.preview.relationshipLabel")}:</span>{" "}
                <span>{previewRelationship}</span>
              </p>
              <p>
                <span className="font-medium">{t("weddingGuestsPage.addGuest.preview.childrenLabel")}:</span>{" "}
                <span>{previewChildren}</span>
              </p>
              <p>
                <span className="font-medium">{t("weddingGuestsPage.addGuest.preview.eventsLabel")}:</span>{" "}
                <span>{previewEvents}</span>
              </p>
            </div>
          </div>
        </aside>
      </div>

      <DialogFooter className="border-t border-zinc-200 px-6 py-4 sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          {t("weddingGuestsPage.addGuest.actions.cancel")}
        </Button>
        <Button
          type="submit"
          form="add-guest-form"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("common.loading") : t("weddingGuestsPage.addGuest.actions.submit")}
        </Button>
      </DialogFooter>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] rounded-none border-zinc-200 bg-white p-0">
          <DrawerTitle className="sr-only">{t("weddingGuestsPage.addGuest.title")}</DrawerTitle>
          {renderDialogBody()}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(92dvh,900px)] max-w-[1200px] gap-0 overflow-hidden p-0"
        closeLabel={t("common.close")}
      >
        {renderDialogBody()}
      </DialogContent>
    </Dialog>
  );
}
