const SUPABASE_URL = "https://vjwrgibbirtaeyqbzoxk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ha-xTX201rlnk1_eVm46pg_XZOrdl3v";
const APP_BASE_URL = "https://agendafacil-two.vercel.app";
const SUPPORT_ACCOUNT_EMAIL = "agendafacil26@gmail.com";

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  if (!window.supabase?.createClient) {
    throw new Error("O SDK do Supabase nao carregou no navegador.");
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabaseClient;
}

const STATUS_LABELS = {
  confirmado: { label: "Confirmado", cls: "badge-success" },
  pendente: { label: "Pendente", cls: "badge-warning" },
  cancelado: { label: "Cancelado", cls: "badge-danger" },
  concluido: { label: "Concluido", cls: "badge-brand" },
};

const DEFAULT_SERVICES = [
  {
    name: "Corte Feminino",
    description: "Corte personalizado com finalizacao profissional",
    price: 85,
    duration: 60,
    category: "Corte",
    icon: "✂️",
    active: true,
  },
  {
    name: "Escova",
    description: "Escova lisa ou modelada para qualquer ocasiao",
    price: 55,
    duration: 45,
    category: "Tratamento",
    icon: "💨",
    active: true,
  },
  {
    name: "Coloracao",
    description: "Coloracao profissional com consultoria de tom",
    price: 160,
    duration: 120,
    category: "Coloracao",
    icon: "🎨",
    active: true,
  },
  {
    name: "Manicure",
    description: "Cuidado completo para unhas e cuticulas",
    price: 40,
    duration: 40,
    category: "Tratamento",
    icon: "💅",
    active: true,
  },
];

const DEFAULT_PROFESSIONALS = [
  {
    name: "Ana Souza",
    role: "Cabeleireira Senior",
    emoji: "👩",
    active: true,
    serviceNames: ["Corte Feminino", "Escova", "Coloracao"],
  },
  {
    name: "Bruna Lima",
    role: "Colorista",
    emoji: "🧑",
    active: true,
    serviceNames: ["Coloracao", "Escova"],
  },
  {
    name: "Carla Mendes",
    role: "Manicure",
    emoji: "💅",
    active: true,
    serviceNames: ["Manicure"],
  },
];

const DEFAULT_HOURS = [
  { day_of_week: 0, day_name: "Domingo", open_time: null, close_time: null, active: false },
  { day_of_week: 1, day_name: "Segunda", open_time: "09:00", close_time: "19:00", active: true },
  { day_of_week: 2, day_name: "Terca", open_time: "09:00", close_time: "19:00", active: true },
  { day_of_week: 3, day_name: "Quarta", open_time: "09:00", close_time: "19:00", active: true },
  { day_of_week: 4, day_name: "Quinta", open_time: "09:00", close_time: "19:00", active: true },
  { day_of_week: 5, day_name: "Sexta", open_time: "09:00", close_time: "20:00", active: true },
  { day_of_week: 6, day_name: "Sabado", open_time: "08:00", close_time: "18:00", active: true },
];

const FALLBACK_PUBLIC = {
  business: {
    id: "demo-business",
    name: "AgendaFacil Demo",
    slug: "demo",
    category: "Salao de Beleza",
    description: "Preview demonstrativo do fluxo publico de agendamento.",
    whatsapp: "(11) 99999-0000",
    instagram: "@agendafacil.demo",
    address: "Rua das Flores, 123 - Centro",
    logo_emoji: "✂️",
    logo_image_url: "",
    cover_image_url: "",
  },
  services: DEFAULT_SERVICES.map((item, index) => ({ ...item, id: `demo-service-${index + 1}` })),
  professionals: DEFAULT_PROFESSIONALS.map((item, index) => ({
    ...item,
    id: `demo-prof-${index + 1}`,
  })),
  hours: DEFAULT_HOURS,
};

const state = {
  session: null,
  user: null,
  isPlatformAdmin: false,
  business: null,
  services: [],
  professionals: [],
  professionalServices: [],
  appointments: [],
  hours: [],
  currentFilter: "todos",
  selectedAppointment: null,
  editingAppointmentId: null,
  editingServiceId: null,
  editingProfessionalId: null,
  pendingConfirmAction: null,
  supportBusinesses: [],
  supportSelectedBusinessId: null,
  supportContextBusinessId: null,
  publicData: {
    business: null,
    services: [],
    professionals: [],
    hours: [],
  },
};

let bookingState = {
  mode: "service",
  serviceId: null,
  profId: null,
  date: null,
  time: null,
};

let pubStepHistory = [0];
let toastTimer = null;

document.addEventListener("DOMContentLoaded", async () => {
  exposeActionsToWindow();
  setupStaticBehavior();
  setTodayDate();
  await bootstrapApp();
});

function exposeActionsToWindow() {
  Object.assign(window, {
    switchAuthMode,
    openAppEntry,
    showPublicBooking,
    completeInitialSetup,
    logout,
    navTo,
    filterAppt,
    openApptDetail,
    updateAppointmentStatus,
    saveAppointment,
    openAppointmentModal,
    closeAppointmentModal,
    editAppointmentFromDetail,
    deleteAppointment,
    confirmDeleteAppointment,
    saveService,
    saveProfessional,
    openServiceModal,
    closeServiceModal,
    editService,
    toggleServiceActive,
    openProfessionalModal,
    closeProfessionalModal,
    editProfessional,
    toggleProfessionalActive,
    pubBack,
    startBooking,
    goNextFromService,
    goNextFromProf,
    selectService,
    selectProf,
    selectDate,
    selectTime,
    confirmBooking,
    sendWAConfirmation,
    copyWAMsg,
    copyLink,
    shareWhatsApp,
    openBusinessWhatsApp,
    openBusinessInstagram,
    openHostedPublicPage,
    handleBusinessLogoUpload,
    handleBusinessCoverUpload,
    toggleCardMenu,
    closeConfirmActionModal,
    renderSupportBusinesses,
    openSupportBusinessModal,
    saveSupportBusiness,
    sendSupportPasswordReset,
    toggleBusinessBlocked,
    supportCreateService,
    supportCreateProfessional,
    openModal,
    closeModal,
    toggleHourInputs,
    doLogin,
    doSignup,
    saveBusinessProfile,
  });
}

function setupStaticBehavior() {
  const signupBusinessName = document.getElementById("signupBusinessName");
  const signupSlug = document.getElementById("signupSlug");
  const signupEmail = document.getElementById("signupEmail");
  const setupBusinessName = document.getElementById("setupBusinessName");
  const setupSlug = document.getElementById("setupSlug");

  signupBusinessName.addEventListener("input", () => {
    if (!signupSlug.dataset.edited) {
      signupSlug.value = slugify(signupBusinessName.value);
    }
  });
  setupBusinessName.addEventListener("input", () => {
    if (!setupSlug.dataset.edited) {
      setupSlug.value = slugify(setupBusinessName.value);
    }
  });
  signupSlug.addEventListener("input", () => {
    signupSlug.dataset.edited = "1";
  });
  signupEmail.addEventListener("input", () => {
    syncSignupFormMode();
  });
  setupSlug.addEventListener("input", () => {
    setupSlug.dataset.edited = "1";
  });

  document.getElementById("tabLogin").addEventListener("click", () => switchAuthMode("login"));
  document.getElementById("tabSignup").addEventListener("click", () => switchAuthMode("signup"));
  document.getElementById("btnPublicPreview").addEventListener("click", () => showPublicBooking());
  document.getElementById("confirmActionButton").addEventListener("click", () => {
    runPendingConfirmAction();
  });
  setupPhoneMasks();

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("open");
      }
    });
  });

  document.addEventListener("click", (event) => {
    const insideMenu = event.target.closest(".card-menu");
    document.querySelectorAll(".card-menu").forEach((menu) => {
      if (!insideMenu || menu !== insideMenu) {
        menu.classList.remove("open");
      }
    });
  });

  syncSignupFormMode();
}

function setupPhoneMasks() {
  document.querySelectorAll("[data-br-phone='true']").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatBrazilPhone(input.value);
    });
    input.addEventListener("blur", () => {
      input.value = formatBrazilPhone(input.value);
    });
  });
}

async function bootstrapApp() {
  showLoading(true);
  try {
    const client = getSupabaseClient();
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const appMode = params.get("app");
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    state.session = session;
    state.user = session?.user ?? null;

    client.auth.onAuthStateChange(async (_event, nextSession) => {
      state.session = nextSession;
      state.user = nextSession?.user ?? null;
    });

    if (slug) {
      await loadPublicData(slug);
      showScreen("publicShell");
      pubGoRaw(0);
      return;
    }

    if (session?.user) {
      await loadAdminExperience();
      return;
    }

    if (appMode) {
      showScreen("loginPage");
      if (appMode === "signup") {
        switchAuthMode("signup");
      }
    } else {
      showScreen("landingPage");
    }
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
    showScreen("landingPage");
  } finally {
    showLoading(false);
  }
}

async function loadAdminExperience() {
  await loadPlatformAdminStatus();
  await ensureBusinessExists();

  if (!state.business && !state.isPlatformAdmin) {
    showSetupPage();
    return;
  }

  if (state.business && !state.business.active && !state.isPlatformAdmin) {
    document.getElementById("blockedReasonText").textContent =
      state.business.blocked_reason || "Sua conta está temporariamente bloqueada. Fale com o suporte para regularizar.";
    showScreen("blockedPage");
    return;
  }

  applyBodyMode(state.isPlatformAdmin ? "support" : "app");
  showScreen("adminShell");
  if (state.business) {
    await refreshAllBusinessData();
  }
  await loadSupportBusinesses();
  document.getElementById("supportNavItem").classList.toggle("hidden", !state.isPlatformAdmin);
  navTo(state.isPlatformAdmin ? "pageSupport" : "pageDashboard");
}

async function loadPlatformAdminStatus() {
  if (!state.user) {
    state.isPlatformAdmin = false;
    return;
  }
  const client = getSupabaseClient();
  const { data, error } = await client.rpc("is_platform_admin");
  if (error) {
    state.isPlatformAdmin = false;
    return;
  }
  state.isPlatformAdmin = Boolean(data);
}

function openAppEntry(mode) {
  const target = mode === "signup" ? `${APP_BASE_URL}/?app=signup` : `${APP_BASE_URL}/?app=login`;
  window.location.href = target;
}

async function ensureBusinessExists() {
  if (isInternalSupportAccount()) {
    localStorage.removeItem("agendafacil_pending_setup");
    state.business = null;
    return;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("businesses")
    .select("*")
    .eq("owner_id", state.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    state.business = data;
    localStorage.removeItem("agendafacil_pending_setup");
    return;
  }

  const pending = getPendingSetup() || getPendingSetupFromMetadata();
  if (pending) {
    await createBusinessWithSeed(pending);
    localStorage.removeItem("agendafacil_pending_setup");
    return;
  }

  state.business = null;
}

async function refreshAllBusinessData() {
  if (!state.business) {
    return;
  }

  const client = getSupabaseClient();
  const businessId = state.business.id;
  const [servicesResult, professionalsResult, appointmentsResult, hoursResult] = await Promise.all([
    client.from("services").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    client.from("professionals").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    client.from("appointments").select("*").eq("business_id", businessId).order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true }),
    client.from("business_hours").select("*").eq("business_id", businessId).order("day_of_week", { ascending: true }),
  ]);

  if (servicesResult.error) throw servicesResult.error;
  if (professionalsResult.error) throw professionalsResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;
  if (hoursResult.error) throw hoursResult.error;

  state.services = servicesResult.data ?? [];
  state.professionals = professionalsResult.data ?? [];

  const professionalIds = state.professionals.map((item) => item.id);
  if (professionalIds.length) {
    const freshProfessionalServices = await client
      .from("professional_services")
      .select("professional_id, service_id")
      .in("professional_id", professionalIds);
    if (freshProfessionalServices.error) throw freshProfessionalServices.error;
    state.professionalServices = freshProfessionalServices.data ?? [];
  } else {
    state.professionalServices = [];
  }

  state.appointments = appointmentsResult.data ?? [];
  state.hours = hoursResult.data ?? [];

  renderAdmin();
}

function renderAdmin() {
  renderBusinessProfile();
  renderDashboard();
  renderApptList(state.currentFilter);
  renderServicos();
  renderProfissionais();
  renderHorarios();
  populateModalOptions();
  updatePublicLink();
}

function renderBusinessProfile() {
  const business = state.business;
  if (!business) return;

  document.getElementById("greetingName").textContent = business.name;
  document.getElementById("avatarInitial").textContent = (business.name || "A").trim().charAt(0).toUpperCase();
  document.getElementById("businessName").value = business.name || "";
  document.getElementById("businessSlug").value = business.slug || "";
  document.getElementById("businessCategory").value = business.category || "Barbearia";
  document.getElementById("businessDescription").value = business.description || "";
  document.getElementById("businessWhatsapp").value = business.whatsapp || "";
  document.getElementById("businessInstagram").value = business.instagram || "";
  document.getElementById("businessAddress").value = business.address || "";
  document.getElementById("businessLogoEmoji").value = business.logo_emoji || "✂️";
  applyBusinessPreview(business);
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = state.appointments.filter((item) => item.appointment_date === today && item.status !== "cancelado");
  const revenue = todayItems.reduce((total, item) => total + (findService(item.service_id)?.price || 0), 0);

  document.getElementById("statTodayCount").textContent = String(todayItems.length);
  document.getElementById("statRevenue").textContent = formatCurrency(revenue);
  document.getElementById("statTopService").textContent = getTopServiceName();
  document.getElementById("statTopProfessional").textContent = getTopProfessionalName();

  const list = state.appointments.slice(0, 5);
  document.getElementById("dashApptList").innerHTML = list.length
    ? list
        .map((appointment) => {
          const service = findService(appointment.service_id);
          const professional = findProfessional(appointment.professional_id);
          const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;
          return `
            <div class="appt-item" onclick="openApptDetail('${appointment.id}')">
              <div class="appt-time">${formatTime(appointment.appointment_time)}</div>
              <div class="appt-info">
                <div class="name">${appointment.client_name}</div>
                <div class="detail">${service?.name || "Servico"} · ${professional?.name || "Sem preferencia"}</div>
              </div>
              <span class="badge ${status.cls}">${status.label}</span>
            </div>`;
        })
        .join("")
    : renderEmptyState("Nenhum agendamento por enquanto.");
}

function renderApptList(filter) {
  let list = [...state.appointments];
  if (filter !== "todos") {
    list = list.filter((item) => item.status === filter);
  }

  document.getElementById("apptList").innerHTML = list.length
    ? list
        .map((appointment) => {
          const service = findService(appointment.service_id);
          const professional = findProfessional(appointment.professional_id);
          const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;
          const dateStr = formatDateShort(appointment.appointment_date);
          return `
            <div class="appt-item" onclick="openApptDetail('${appointment.id}')">
              <div>
                <div class="appt-time">${formatTime(appointment.appointment_time)}</div>
                <div class="text-xs text-sub">${dateStr}</div>
              </div>
              <div class="appt-info">
                <div class="name">${appointment.client_name}</div>
                <div class="detail">${service?.name || "Servico"} · ${(professional?.emoji || "👤")} ${professional?.name || "Sem preferencia"}</div>
              </div>
              <span class="badge ${status.cls}">${status.label}</span>
            </div>`;
        })
        .join("")
    : renderEmptyState("Nenhum agendamento encontrado.");
}

function renderServicos() {
  document.getElementById("servicosList").innerHTML = state.services.length
    ? state.services
        .map(
          (service) => `
            <div class="card card-sm flex items-center gap-3 ${service.active ? "" : "soft-inactive"}" style="margin-bottom:10px;">
              <div class="service-icon">${service.icon || "✂️"}</div>
              <div style="flex:1;">
                <div class="flex justify-between items-center gap-2">
                  <div class="font-semibold">${service.name}</div>
                  <div class="flex items-center gap-2">
                    <span class="badge ${service.active ? "badge-success" : "badge-danger"}">${service.active ? "Ativo" : "Inativo"}</span>
                    <div class="card-menu" id="service-menu-${service.id}">
                      <button class="card-menu-btn" type="button" onclick="toggleCardMenu('service-menu-${service.id}')">⋯</button>
                      <div class="card-menu-sheet">
                        <button class="card-menu-item" type="button" onclick="editService('${service.id}')">Editar</button>
                        <button class="card-menu-item warning" type="button" onclick="toggleServiceActive('${service.id}')">${service.active ? "Desativar" : "Reativar"}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-sm text-sub mt-1">${service.description || ""}</div>
                <div class="flex gap-3 mt-1">
                  <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
                  <span class="text-sm text-sub">⏱ ${service.duration} min</span>
                  <span class="chip" style="margin:0;padding:2px 8px;font-size:10px;">${service.category || "Servico"}</span>
                </div>
              </div>
            </div>`
        )
        .join("")
    : renderEmptyState("Cadastre seu primeiro servico.");
}

function renderProfissionais() {
  document.getElementById("profissionaisList").innerHTML = state.professionals.length
    ? state.professionals
        .map((professional) => {
          const serviceNames = state.professionalServices
            .filter((item) => item.professional_id === professional.id)
            .map((item) => findService(item.service_id)?.name)
            .filter(Boolean);

          return `
            <div class="card card-sm flex items-center gap-3 ${professional.active ? "" : "soft-inactive"}" style="margin-bottom:10px;">
              <div class="avatar avatar-lg">${professional.emoji || "👤"}</div>
              <div style="flex:1;">
                <div class="flex justify-between items-center gap-2">
                  <div class="font-bold">${professional.name}</div>
                  <div class="flex items-center gap-2">
                    <span class="badge ${professional.active ? "badge-success" : "badge-danger"}">${professional.active ? "Ativo" : "Inativo"}</span>
                    <div class="card-menu" id="professional-menu-${professional.id}">
                      <button class="card-menu-btn" type="button" onclick="toggleCardMenu('professional-menu-${professional.id}')">⋯</button>
                      <div class="card-menu-sheet">
                        <button class="card-menu-item" type="button" onclick="editProfessional('${professional.id}')">Editar</button>
                        <button class="card-menu-item warning" type="button" onclick="toggleProfessionalActive('${professional.id}')">${professional.active ? "Desativar" : "Reativar"}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-sm text-sub">${professional.role || ""}</div>
                <div class="mt-1">${serviceNames.map((name) => `<span class="chip" style="margin-bottom:0;">${name}</span>`).join("")}</div>
              </div>
            </div>`;
        })
        .join("")
    : renderEmptyState("Cadastre seu primeiro profissional.");
}

function renderHorarios() {
  const list = state.hours.length ? state.hours : DEFAULT_HOURS;
  document.getElementById("horariosList").innerHTML = list
    .map(
      (hour) => `
        <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div class="font-semibold text-sm" style="min-width:80px;">${hour.day_name}</div>
          <div class="flex gap-2" style="align-items:center;">
            <input type="time" id="hour-open-${hour.day_of_week}" value="${hour.open_time || ""}" ${hour.active ? "" : "disabled"} style="width:110px;" />
            <span class="text-sm text-sub">ate</span>
            <input type="time" id="hour-close-${hour.day_of_week}" value="${hour.close_time || ""}" ${hour.active ? "" : "disabled"} style="width:110px;" />
          </div>
          <label class="toggle">
            <input type="checkbox" id="hour-active-${hour.day_of_week}" ${hour.active ? "checked" : ""} onchange="toggleHourInputs(${hour.day_of_week})" />
            <span class="toggle-slider"></span>
          </label>
        </div>`
    )
    .join("");
}

function populateModalOptions() {
  const serviceOptions = state.services
    .map((service) => `<option value="${service.id}">${service.name}</option>`)
    .join("");
  const professionalOptions = [`<option value="">Sem preferencia</option>`]
    .concat(state.professionals.map((professional) => `<option value="${professional.id}">${professional.name}</option>`))
    .join("");

  document.getElementById("newApptService").innerHTML = serviceOptions;
  document.getElementById("newApptProfessional").innerHTML = professionalOptions;
  document.getElementById("newProfServices").innerHTML = serviceOptions;
}

async function populateProfessionalServicesForBusiness(businessId) {
  const client = getSupabaseClient();
  const { data, error } = await client.from("services").select("id,name").eq("business_id", businessId).order("created_at", { ascending: true });
  if (error) throw error;
  document.getElementById("newProfServices").innerHTML = (data ?? [])
    .map((service) => `<option value="${service.id}">${service.name}</option>`)
    .join("");
}

function updatePublicLink() {
  if (!state.business) return;
  const publicUrl = getPublicAppUrl(state.business.slug);
  document.getElementById("bizLink").textContent = publicUrl;
}

async function loadSupportBusinesses() {
  if (!state.isPlatformAdmin) {
    state.supportBusinesses = [];
    return;
  }
  const client = getSupabaseClient();
  const { data, error } = await client.from("businesses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  state.supportBusinesses = (data ?? []).filter((business) => !isSupportInternalBusiness(business));
  renderSupportBusinesses();
}

function renderSupportBusinesses() {
  if (!state.isPlatformAdmin) return;
  const search = document.getElementById("supportSearch")?.value?.trim().toLowerCase() || "";
  const filtered = state.supportBusinesses.filter((business) => {
    const haystack = [business.name, business.slug, business.owner_email, business.whatsapp].join(" ").toLowerCase();
    return haystack.includes(search);
  });

  document.getElementById("supportTotalBusinesses").textContent = String(state.supportBusinesses.length);
  document.getElementById("supportBlockedBusinesses").textContent = String(state.supportBusinesses.filter((item) => !item.active).length);
  document.getElementById("supportBusinessList").innerHTML = filtered.length
    ? filtered
        .map(
          (business) => `
            <div class="card ${business.active ? "" : "soft-inactive"}">
              <div class="flex justify-between items-center gap-2">
                <div>
                  <div class="font-bold">${business.name}</div>
                  <div class="text-sm text-sub">${business.owner_email || "Sem e-mail"} · /?slug=${business.slug}</div>
                </div>
                <span class="badge ${business.active ? "badge-success" : "badge-danger"}">${business.active ? "Ativa" : "Bloqueada"}</span>
              </div>
              <div class="text-sm text-sub mt-2">Plano: ${business.plan_name || "Plano Mensal 29,90"} · Cobrança: ${business.billing_status || "active"}</div>
              <div class="card-actions" style="margin-top:12px;">
                <button class="btn btn-link btn-sm" type="button" onclick="openSupportBusinessModal('${business.id}')">Gerenciar</button>
                <button class="btn ${business.active ? "btn-warning" : "btn-success"} btn-sm" type="button" onclick="toggleBusinessBlocked('${business.id}')">${business.active ? "Bloquear" : "Desbloquear"}</button>
                <button class="btn btn-ghost btn-sm" type="button" onclick="sendSupportPasswordReset('${business.id}')">Reset senha</button>
              </div>
            </div>`
        )
        .join("")
    : renderEmptyState("Nenhuma loja encontrada.");
}

function openSupportBusinessModal(businessId) {
  const business = state.supportBusinesses.find((item) => item.id === businessId);
  if (!business) return;
  state.supportSelectedBusinessId = businessId;
  document.getElementById("supportBusinessTitle").textContent = `Gestão da loja · ${business.name}`;
  document.getElementById("supportBusinessName").value = business.name || "";
  document.getElementById("supportBusinessOwnerEmail").value = business.owner_email || "";
  document.getElementById("supportBusinessWhatsapp").value = business.whatsapp || "";
  document.getElementById("supportBusinessPlan").value = business.plan_name || "Plano Mensal 29,90";
  document.getElementById("supportBusinessBilling").value = business.billing_status || "active";
  document.getElementById("supportBusinessBlockedReason").value = business.blocked_reason || "";
  document.getElementById("supportBusinessNotes").value = business.support_notes || "";
  openModal("modalSupportBusiness");
}

async function saveSupportBusiness() {
  if (!state.supportSelectedBusinessId) return;
  const client = getSupabaseClient();
  const billingStatus = document.getElementById("supportBusinessBilling").value;
  const payload = {
    name: document.getElementById("supportBusinessName").value.trim(),
    owner_email: document.getElementById("supportBusinessOwnerEmail").value.trim(),
    whatsapp: document.getElementById("supportBusinessWhatsapp").value.trim(),
    plan_name: document.getElementById("supportBusinessPlan").value.trim() || "Plano Mensal 29,90",
    billing_status: billingStatus,
    blocked_reason: document.getElementById("supportBusinessBlockedReason").value.trim(),
    support_notes: document.getElementById("supportBusinessNotes").value.trim(),
    active: billingStatus !== "blocked",
  };

  showLoading(true);
  try {
    const { error } = await client.from("businesses").update(payload).eq("id", state.supportSelectedBusinessId);
    if (error) throw error;
    closeModal("modalSupportBusiness");
    showToast("Dados de suporte salvos.");
    await loadSupportBusinesses();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function sendSupportPasswordReset(businessId = null) {
  const targetBusiness = state.supportBusinesses.find((item) => item.id === (businessId || state.supportSelectedBusinessId));
  if (!targetBusiness?.owner_email) {
    showToast("Essa loja não possui e-mail de contato salvo.");
    return;
  }
  const client = getSupabaseClient();
  showLoading(true);
  try {
    const { error } = await client.auth.resetPasswordForEmail(targetBusiness.owner_email, {
      redirectTo: `${APP_BASE_URL}/?app=login`,
    });
    if (error) throw error;
    showToast("E-mail de redefinição enviado.");
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function toggleBusinessBlocked(businessId) {
  const business = state.supportBusinesses.find((item) => item.id === businessId);
  if (!business) return;
  openConfirmActionModal({
    title: business.active ? "Bloquear conta" : "Desbloquear conta",
    message: business.active
      ? `Deseja bloquear a conta de "${business.name}"?`
      : `Deseja desbloquear a conta de "${business.name}"?`,
    confirmLabel: business.active ? "Bloquear conta" : "Desbloquear conta",
    confirmClass: business.active ? "btn btn-danger" : "btn btn-success",
    onConfirm: async () => {
      const client = getSupabaseClient();
      const payload = business.active
        ? { active: false, billing_status: "blocked", blocked_reason: business.blocked_reason || "Conta bloqueada pelo suporte." }
        : { active: true, billing_status: "active", blocked_reason: null };
      const { error } = await client.from("businesses").update(payload).eq("id", businessId);
      if (error) throw error;
      showToast(business.active ? "Conta bloqueada." : "Conta desbloqueada.");
      await loadSupportBusinesses();
    },
  });
}

function supportCreateService() {
  if (!state.supportSelectedBusinessId) return;
  state.supportContextBusinessId = state.supportSelectedBusinessId;
  resetServiceModal();
  openServiceModal();
}

async function supportCreateProfessional() {
  if (!state.supportSelectedBusinessId) return;
  state.supportContextBusinessId = state.supportSelectedBusinessId;
  await populateProfessionalServicesForBusiness(state.supportSelectedBusinessId);
  resetProfessionalModal();
  openProfessionalModal();
}

function navTo(pageId) {
  document.querySelectorAll("#adminShell .page").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.page === pageId));
}

function filterAppt(filter, event) {
  state.currentFilter = filter;
  document.querySelectorAll(".appt-filter-btn").forEach((button) => {
    button.classList.toggle("btn-brand", button.dataset.filter === filter);
    button.classList.toggle("btn-ghost", button.dataset.filter !== filter);
  });
  if (event?.target) {
    event.target.blur();
  }
  renderApptList(filter);
}

function openApptDetail(id) {
  const appointment = state.appointments.find((item) => item.id === id);
  if (!appointment) return;

  state.selectedAppointment = appointment;
  const service = findService(appointment.service_id);
  const professional = findProfessional(appointment.professional_id);
  const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;

  document.getElementById("detailClientName").textContent = appointment.client_name;
  document.getElementById("detailClientPhone").textContent = appointment.client_phone;
  document.getElementById("detailService").textContent = service?.name || "—";
  document.getElementById("detailProf").textContent = professional?.name || "Sem preferencia";
  document.getElementById("detailDate").textContent = formatLongDate(appointment.appointment_date);
  document.getElementById("detailTime").textContent = formatTime(appointment.appointment_time);
  document.getElementById("detailPrice").textContent = formatCurrency(service?.price || 0);
  document.getElementById("detailStatus").innerHTML = `<span class="badge ${status.cls}">${status.label}</span>`;
  openModal("modalApptDetail");
}

function openAppointmentModal() {
  resetAppointmentModal();
  openModal("modalNovoAppt");
}

function closeAppointmentModal() {
  closeModal("modalNovoAppt");
  resetAppointmentModal();
}

function editAppointmentFromDetail() {
  if (!state.selectedAppointment) return;
  const appointment = state.selectedAppointment;
  state.editingAppointmentId = appointment.id;
  document.getElementById("apptModalTitle").textContent = "Editar Agendamento";
  document.getElementById("apptModalSaveBtn").textContent = "Salvar Alterações";
  document.getElementById("newApptClient").value = appointment.client_name || "";
  document.getElementById("newApptPhone").value = appointment.client_phone || "";
  document.getElementById("newApptService").value = appointment.service_id || "";
  document.getElementById("newApptProfessional").value = appointment.professional_id || "";
  document.getElementById("newApptDate").value = appointment.appointment_date || "";
  document.getElementById("newApptTime").value = formatTime(appointment.appointment_time);
  closeModal("modalApptDetail");
  openModal("modalNovoAppt");
}

async function updateAppointmentStatus(status) {
  if (!state.selectedAppointment) return;
  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from("appointments")
      .update({ status })
      .eq("id", state.selectedAppointment.id);
    if (error) throw error;
    closeModal("modalApptDetail");
    showToast("Status atualizado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getFriendlyAppointmentError(error));
  } finally {
    showLoading(false);
  }
}

async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  if (!email || !password) {
    showToast("Preencha e-mail e senha.");
    return;
  }

  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    state.session = data.session;
    state.user = data.user;
    await loadAdminExperience();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function doSignup() {
  const isSupportSignup = isSupportAccountEmail(document.getElementById("signupEmail").value.trim());
  const draft = {
    name: document.getElementById("signupBusinessName").value.trim(),
    slug: slugify(document.getElementById("signupSlug").value.trim()),
    category: document.getElementById("signupCategory").value,
    email: document.getElementById("signupEmail").value.trim(),
    password: document.getElementById("signupPass").value.trim(),
  };

  if ((!isSupportSignup && (!draft.name || !draft.slug)) || !draft.email || !draft.password) {
    showToast("Preencha todos os campos para criar a conta.");
    return;
  }

  showLoading(true);
  try {
    const client = getSupabaseClient();
    if (isSupportSignup) {
      localStorage.removeItem("agendafacil_pending_setup");
    } else {
      localStorage.setItem("agendafacil_pending_setup", JSON.stringify(draft));
    }
    const { data, error } = await client.auth.signUp({
      email: draft.email,
      password: draft.password,
      options: {
        data: isSupportSignup
          ? {}
          : {
              pending_business: {
                name: draft.name,
                slug: draft.slug,
                category: draft.category,
              },
            },
      },
    });
    if (error) throw error;

    if (data.session?.user) {
      state.session = data.session;
      state.user = data.user;
      if (!isSupportSignup) {
        await createBusinessWithSeed(draft);
      }
      await loadAdminExperience();
      return;
    }

    showToast(
      isSupportSignup
        ? "Conta interna criada. Confirme seu e-mail e depois faça login no painel de suporte."
        : "Conta criada. Confirme seu e-mail no Supabase e depois faça login."
    );
    switchAuthMode("login");
    document.getElementById("loginEmail").value = draft.email;
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function completeInitialSetup() {
  const draft = {
    name: document.getElementById("setupBusinessName").value.trim(),
    slug: slugify(document.getElementById("setupSlug").value.trim()),
    category: document.getElementById("setupCategory").value,
    description: document.getElementById("setupDescription").value.trim(),
    whatsapp: document.getElementById("setupWhatsapp").value.trim(),
  };

  if (!draft.name || !draft.slug) {
    showToast("Informe nome e slug do negocio.");
    return;
  }

  showLoading(true);
  try {
    await createBusinessWithSeed(draft);
    await loadAdminExperience();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function createBusinessWithSeed(draft) {
  const client = getSupabaseClient();
  const payload = {
    owner_id: state.user.id,
    owner_email: draft.email || state.user.email || "",
    name: draft.name,
    slug: draft.slug,
    category: draft.category || "Salao de Beleza",
    description: draft.description || "Atendimento profissional com agendamento online.",
    whatsapp: draft.whatsapp || "",
    instagram: draft.instagram || "",
    address: draft.address || "",
    logo_emoji: draft.logo_emoji || "✂️",
    logo_image_url: draft.logo_image_url || "",
    cover_image_url: draft.cover_image_url || "",
    plan_name: draft.plan_name || "Plano Mensal 29,90",
    billing_status: draft.billing_status || "active",
    active: true,
  };

  const { data: business, error } = await client.from("businesses").insert(payload).select().single();
  if (error) throw error;

  state.business = business;
  await seedBusinessData(business.id);
}

async function seedBusinessData(businessId) {
  const client = getSupabaseClient();
  const existing = await client.from("services").select("id").eq("business_id", businessId).limit(1);
  if (existing.error) throw existing.error;
  if ((existing.data ?? []).length) return;

  const { data: services, error: servicesError } = await client
    .from("services")
    .insert(DEFAULT_SERVICES.map((service) => ({ ...service, business_id: businessId })))
    .select();
  if (servicesError) throw servicesError;

  const { data: professionals, error: professionalsError } = await client
    .from("professionals")
    .insert(DEFAULT_PROFESSIONALS.map(({ serviceNames, ...professional }) => ({ ...professional, business_id: businessId })))
    .select();
  if (professionalsError) throw professionalsError;

  const serviceByName = Object.fromEntries(services.map((service) => [service.name, service.id]));
  const professionalByName = Object.fromEntries(professionals.map((professional) => [professional.name, professional.id]));
  const pivotRows = DEFAULT_PROFESSIONALS.flatMap((professional) =>
    professional.serviceNames.map((serviceName) => ({
      professional_id: professionalByName[professional.name],
      service_id: serviceByName[serviceName],
    }))
  );

  if (pivotRows.length) {
    const { error: pivotError } = await client.from("professional_services").insert(pivotRows);
    if (pivotError) throw pivotError;
  }

  const { error: hoursError } = await client
    .from("business_hours")
    .insert(DEFAULT_HOURS.map((hour) => ({ ...hour, business_id: businessId })));
  if (hoursError) throw hoursError;
}

async function saveBusinessProfile() {
  if (!state.business) return;
  const client = getSupabaseClient();

  const payload = {
    name: document.getElementById("businessName").value.trim(),
    slug: slugify(document.getElementById("businessSlug").value.trim()),
    category: document.getElementById("businessCategory").value,
    description: document.getElementById("businessDescription").value.trim(),
    whatsapp: document.getElementById("businessWhatsapp").value.trim(),
    instagram: document.getElementById("businessInstagram").value.trim(),
    address: document.getElementById("businessAddress").value.trim(),
    logo_emoji: document.getElementById("businessLogoEmoji").value.trim() || "✂️",
    logo_image_url: state.business.logo_image_url || "",
    cover_image_url: state.business.cover_image_url || "",
  };

  if (!payload.name || !payload.slug) {
    showToast("Nome e slug sao obrigatorios.");
    return;
  }

  const hoursPayload = (state.hours.length ? state.hours : DEFAULT_HOURS).map((hour) => {
    const active = document.getElementById(`hour-active-${hour.day_of_week}`).checked;
    return {
      business_id: state.business.id,
      day_of_week: hour.day_of_week,
      day_name: hour.day_name,
      open_time: active ? document.getElementById(`hour-open-${hour.day_of_week}`).value || null : null,
      close_time: active ? document.getElementById(`hour-close-${hour.day_of_week}`).value || null : null,
      active,
    };
  });

  showLoading(true);
  try {
    const { error } = await client.from("businesses").update(payload).eq("id", state.business.id);
    if (error) throw error;

    const { error: upsertError } = await client
      .from("business_hours")
      .upsert(hoursPayload, { onConflict: "business_id,day_of_week" });
    if (upsertError) throw upsertError;

    state.business = { ...state.business, ...payload };
    showToast("Dados do negocio salvos.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function saveService() {
  if (!state.business && !state.supportContextBusinessId) return;
  const client = getSupabaseClient();
  const isEditing = Boolean(state.editingServiceId);
  const targetBusinessId = state.supportContextBusinessId || state.business.id;
  const payload = {
    business_id: targetBusinessId,
    name: document.getElementById("newServiceName").value.trim(),
    description: document.getElementById("newServiceDescription").value.trim(),
    category: document.getElementById("newServiceCategory").value,
    price: Number(document.getElementById("newServicePrice").value || 0),
    duration: Number(document.getElementById("newServiceDuration").value || 0),
    icon: document.getElementById("newServiceIcon").value.trim() || "✂️",
    active: document.getElementById("newServiceActive").checked,
  };

  if (!payload.name || !payload.duration) {
    showToast("Preencha nome e duracao do servico.");
    return;
  }

  showLoading(true);
  try {
    const { error } = isEditing
      ? await client.from("services").update(payload).eq("id", state.editingServiceId)
      : await client.from("services").insert(payload);
    if (error) throw error;
    closeServiceModal();
    resetServiceModal();
    showToast(isEditing ? "Servico atualizado com sucesso." : "Servico salvo com sucesso.");
    state.supportContextBusinessId = null;
    if (state.business) {
      await refreshAllBusinessData();
    }
    if (state.isPlatformAdmin) {
      await loadSupportBusinesses();
    }
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function saveProfessional() {
  if (!state.business && !state.supportContextBusinessId) return;
  const client = getSupabaseClient();
  const isEditing = Boolean(state.editingProfessionalId);
  const targetBusinessId = state.supportContextBusinessId || state.business.id;

  const selectedServiceIds = Array.from(document.getElementById("newProfServices").selectedOptions).map((option) => option.value);
  const payload = {
    business_id: targetBusinessId,
    name: document.getElementById("newProfName").value.trim(),
    role: document.getElementById("newProfRole").value.trim(),
    emoji: document.getElementById("newProfEmoji").value.trim() || "👤",
    active: document.getElementById("newProfActive").checked,
  };

  if (!payload.name) {
    showToast("Informe o nome do profissional.");
    return;
  }

  showLoading(true);
  try {
    const { data: professional, error } = isEditing
      ? await client.from("professionals").update(payload).eq("id", state.editingProfessionalId).select().single()
      : await client.from("professionals").insert(payload).select().single();
    if (error) throw error;

    if (isEditing) {
      const { error: deletePivotError } = await client.from("professional_services").delete().eq("professional_id", professional.id);
      if (deletePivotError) throw deletePivotError;
    }

    if (selectedServiceIds.length) {
      const { error: pivotError } = await client.from("professional_services").insert(
        selectedServiceIds.map((serviceId) => ({
          professional_id: professional.id,
          service_id: serviceId,
        }))
      );
      if (pivotError) throw pivotError;
    }

    closeProfessionalModal();
    resetProfessionalModal();
    showToast(isEditing ? "Profissional atualizado com sucesso." : "Profissional salvo com sucesso.");
    state.supportContextBusinessId = null;
    if (state.business) {
      await refreshAllBusinessData();
    }
    if (state.isPlatformAdmin) {
      await loadSupportBusinesses();
    }
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function saveAppointment() {
  if (!state.business) return;
  const client = getSupabaseClient();
  const isEditing = Boolean(state.editingAppointmentId);

  const payload = {
    business_id: state.business.id,
    client_name: document.getElementById("newApptClient").value.trim(),
    client_phone: document.getElementById("newApptPhone").value.trim(),
    service_id: document.getElementById("newApptService").value,
    professional_id: document.getElementById("newApptProfessional").value || null,
    appointment_date: document.getElementById("newApptDate").value,
    appointment_time: document.getElementById("newApptTime").value,
    status: isEditing ? state.selectedAppointment?.status || "confirmado" : "confirmado",
  };

  if (!payload.client_name || !payload.client_phone || !payload.service_id || !payload.appointment_date || !payload.appointment_time) {
    showToast("Preencha todos os campos do agendamento.");
    return;
  }

  showLoading(true);
  try {
    const { error } = isEditing
      ? await client.from("appointments").update(payload).eq("id", state.editingAppointmentId)
      : await client.from("appointments").insert(payload);
    if (error) throw error;
    closeAppointmentModal();
    resetAppointmentModal();
    showToast(isEditing ? "Agendamento atualizado com sucesso." : "Agendamento criado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function switchAuthMode(mode) {
  const isLogin = mode === "login";
  document.getElementById("tabLogin").classList.toggle("active", isLogin);
  document.getElementById("tabSignup").classList.toggle("active", !isLogin);
  document.getElementById("loginForm").classList.toggle("hidden", !isLogin);
  document.getElementById("signupForm").classList.toggle("hidden", isLogin);
  if (!isLogin) {
    syncSignupFormMode();
  }
}

function showSetupPage() {
  const pending = getPendingSetup();
  if (pending) {
    document.getElementById("setupBusinessName").value = pending.name || "";
    document.getElementById("setupSlug").value = pending.slug || "";
    document.getElementById("setupCategory").value = pending.category || "Salao de Beleza";
  }
  showScreen("setupPage");
}

async function logout() {
  showLoading(true);
  try {
    const client = getSupabaseClient();
    await client.auth.signOut();
    state.session = null;
    state.user = null;
    state.isPlatformAdmin = false;
    state.business = null;
    showScreen("loginPage");
  } finally {
    showLoading(false);
  }
}

async function showPublicBooking() {
  showLoading(true);
  try {
    const slug = state.business?.slug || new URLSearchParams(window.location.search).get("slug");
    if (slug) {
      await loadPublicData(slug);
    } else {
      applyPublicData(FALLBACK_PUBLIC);
    }
    showScreen("publicShell");
    pubGoRaw(0);
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
    applyPublicData(FALLBACK_PUBLIC);
    showScreen("publicShell");
    pubGoRaw(0);
  } finally {
    showLoading(false);
  }
}

async function loadPublicData(slug) {
  const client = getSupabaseClient();
  const { data: business, error } = await client
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!business) {
    throw new Error("Negocio nao encontrado para esse link.");
  }

  const [servicesResult, professionalsResult, hoursResult] = await Promise.all([
    client.from("services").select("*").eq("business_id", business.id).eq("active", true).order("created_at", { ascending: true }),
    client.from("professionals").select("*").eq("business_id", business.id).eq("active", true).order("created_at", { ascending: true }),
    client.from("business_hours").select("*").eq("business_id", business.id).order("day_of_week", { ascending: true }),
  ]);

  if (servicesResult.error) throw servicesResult.error;
  if (professionalsResult.error) throw professionalsResult.error;
  if (hoursResult.error) throw hoursResult.error;

  const professionalIds = (professionalsResult.data ?? []).map((item) => item.id);
  let professionalServices = [];
  if (professionalIds.length) {
    const professionalServicesResult = await client
      .from("professional_services")
      .select("professional_id, service_id")
      .in("professional_id", professionalIds);
    if (professionalServicesResult.error) throw professionalServicesResult.error;
    professionalServices = professionalServicesResult.data ?? [];
  }

  applyPublicData({
    business,
    services: servicesResult.data ?? [],
    professionals: (professionalsResult.data ?? []).map((professional) => ({
      ...professional,
      serviceIds: professionalServices.filter((item) => item.professional_id === professional.id).map((item) => item.service_id),
    })),
    hours: hoursResult.data ?? [],
  });
}

function applyPublicData(publicData) {
  state.publicData = {
    business: publicData.business,
    services: publicData.services,
    professionals: publicData.professionals.map((professional) => ({
      ...professional,
      serviceIds: professional.serviceIds || professional.serviceNames?.map((name) => publicData.services.find((service) => service.name === name)?.id).filter(Boolean) || [],
    })),
    hours: publicData.hours,
  };
  resetBookingFlow();
  renderPublicLanding();
}

function renderPublicLanding() {
  const { business, services, professionals, hours } = state.publicData;
  if (!business) return;

  const hero = document.getElementById("publicHeroEmoji");
  if (business.logo_image_url) {
    hero.innerHTML = `<img src="${business.logo_image_url}" alt="Logo do negocio" style="width:100%;height:100%;object-fit:cover;border-radius:20px;" />`;
  } else {
    hero.textContent = business.logo_emoji || "✂️";
  }
  document.getElementById("publicHeroName").textContent = business.name;
  document.getElementById("publicHeroDescription").textContent = business.description || "Agende seu horario online.";
  document.getElementById("publicHeroAddress").textContent = `📍 ${business.address || "Endereco nao informado"}`;
  document.getElementById("publicHeroWhatsapp").textContent = `💬 ${business.whatsapp || "WhatsApp"}`;
  document.getElementById("publicHeroHours").textContent = `🕐 ${formatHoursSummary(hours)}`;
  document.getElementById("publicAddressCard").textContent = business.address || "Endereco nao informado";
  document.getElementById("publicInstagramCard").textContent = business.instagram || "@sem-instagram";
  if (business.cover_image_url) {
    document.querySelector(".pub-hero").style.backgroundImage = `linear-gradient(160deg, rgba(124,58,237,.8) 0%, rgba(91,33,182,.8) 100%), url(${business.cover_image_url})`;
    document.querySelector(".pub-hero").style.backgroundSize = "cover";
    document.querySelector(".pub-hero").style.backgroundPosition = "center";
  } else {
    document.querySelector(".pub-hero").style.backgroundImage = "";
  }

  document.getElementById("pubServicePreview").innerHTML = services.length
    ? services
        .map(
          (service) => `
            <div class="service-card" style="cursor:default;">
              <div class="service-icon">${service.icon || "✂️"}</div>
              <div style="flex:1;">
                <div class="font-semibold">${service.name}</div>
                <div class="text-xs text-sub mt-1">${service.description || ""}</div>
                <div class="flex gap-3 mt-1">
                  <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
                  <span class="text-xs text-sub">⏱ ${service.duration}min</span>
                </div>
              </div>
            </div>`
        )
        .join("")
    : renderEmptyState("Nenhum servico publico ativo.");

  document.getElementById("pubProfPreview").innerHTML = professionals.length
    ? professionals
        .map(
          (professional) => `
            <div class="prof-card" style="cursor:default;">
              <div class="avatar">${professional.emoji || "👤"}</div>
              <div>
                <div class="font-bold">${professional.name}</div>
                <div class="text-sm text-sub">${professional.role || ""}</div>
              </div>
            </div>`
        )
        .join("")
    : renderEmptyState("Nenhum profissional disponivel.");
}

function resetBookingFlow() {
  bookingState = {
    mode: "service",
    serviceId: null,
    profId: null,
    date: null,
    time: null,
  };
  pubStepHistory = [0];
  document.getElementById("clientName").value = "";
  document.getElementById("clientPhone").value = "";
  document.getElementById("clientNotes").value = "";
  document.getElementById("btnNextFromService").disabled = true;
  document.getElementById("btnNextFromProf").disabled = true;
  document.getElementById("btnNextFromDateTime").disabled = true;
}

function startBooking(mode) {
  resetBookingFlow();
  bookingState.mode = mode;
  if (mode === "service") {
    renderPubServices();
    pubStepHistory = [0, 1];
    pubGoRaw(1);
    return;
  }
  renderPubProfs();
  pubStepHistory = [0, 2];
  pubGoRaw(2);
}

function renderPubServices(filteredProfessionalId = null) {
  const services = filteredProfessionalId
    ? state.publicData.services.filter((service) => {
        const professional = state.publicData.professionals.find((item) => item.id === filteredProfessionalId);
        return professional?.serviceIds?.includes(service.id);
      })
    : state.publicData.services;

  document.getElementById("pubServiceList").innerHTML = services
    .map(
      (service) => `
        <div class="service-card" id="svc-${service.id}" onclick="selectService('${service.id}')">
          <div class="service-icon">${service.icon || "✂️"}</div>
          <div style="flex:1;">
            <div class="font-semibold">${service.name}</div>
            <div class="text-xs text-sub mt-1">${service.description || ""}</div>
            <div class="flex gap-3 mt-1">
              <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
              <span class="text-xs text-sub">⏱ ${service.duration}min</span>
            </div>
          </div>
        </div>`
    )
    .join("");
}

function renderPubProfs(serviceId = null) {
  const professionals = serviceId
    ? state.publicData.professionals.filter((professional) => professional.serviceIds?.includes(serviceId))
    : state.publicData.professionals;

  const firstOption = `
    <div class="prof-card" id="prof-0" onclick="selectProf('0')">
      <div class="avatar">👤</div>
      <div style="flex:1;">
        <div class="font-bold">Sem preferencia</div>
        <div class="text-sm text-sub">Primeiro profissional disponivel</div>
      </div>
    </div>`;

  document.getElementById("pubProfList").innerHTML =
    firstOption +
    professionals
      .map(
        (professional) => `
          <div class="prof-card" id="prof-${professional.id}" onclick="selectProf('${professional.id}')">
            <div class="avatar">${professional.emoji || "👤"}</div>
            <div style="flex:1;">
              <div class="font-bold">${professional.name}</div>
              <div class="text-sm text-sub">${professional.role || ""}</div>
            </div>
          </div>`
      )
      .join("");
}

function selectService(id) {
  bookingState.serviceId = id;
  document.querySelectorAll("#pubServiceList .service-card").forEach((card) => card.classList.remove("selected"));
  document.getElementById(`svc-${id}`)?.classList.add("selected");
  document.getElementById("btnNextFromService").disabled = false;
}

function selectProf(id) {
  bookingState.profId = id === "0" ? 0 : id;
  document.querySelectorAll("#pubProfList .prof-card").forEach((card) => card.classList.remove("selected"));
  document.getElementById(`prof-${id}`)?.classList.add("selected");
  document.getElementById("btnNextFromProf").disabled = false;
}

function goNextFromService() {
  if (!bookingState.serviceId) return;
  if (bookingState.mode === "prof" && bookingState.profId !== null) {
    pubGoStep(3);
    return;
  }
  renderPubProfs(bookingState.serviceId);
  pubGoStep(2);
}

function goNextFromProf() {
  if (bookingState.mode === "prof" && !bookingState.serviceId) {
    renderPubServices(bookingState.profId === 0 ? null : bookingState.profId);
    pubGoStep(1);
    return;
  }
  pubGoStep(3);
}

function pubGoRaw(step) {
  document.querySelectorAll("#publicShell .page").forEach((page) => {
    page.classList.remove("active");
    page.classList.add("hidden");
  });
  const success = document.getElementById("pubSuccess");
  success.style.display = "none";
  success.classList.add("hidden");

  const page = document.getElementById(`pubStep${step}`);
  if (page) {
    page.classList.remove("hidden");
    page.classList.add("active");
  }
}

function pubGoStep(step) {
  if (step === 1) {
    renderPubServices(bookingState.profId && bookingState.profId !== 0 ? bookingState.profId : null);
  }
  if (step === 2) {
    renderPubProfs(bookingState.serviceId || null);
  }
  if (step === 3) {
    renderDateScroll();
    renderTimeGrid();
  }
  if (step === 4) {
    fillSummary();
  }
  pubStepHistory.push(step);
  pubGoRaw(step);
}

function pubBack() {
  if (pubStepHistory.length <= 1) {
    pubGoRaw(0);
    return;
  }
  pubStepHistory.pop();
  pubGoRaw(pubStepHistory[pubStepHistory.length - 1]);
}

function renderDateScroll() {
  const list = [];
  const base = new Date();
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const iso = date.toISOString().slice(0, 10);
    list.push(`
      <button class="date-btn ${index === 0 ? "today" : ""}" type="button" onclick="selectDate('${iso}')">
        <span style="font-size:10px;">${labels[date.getDay()]}</span>
        <span class="day-num">${date.getDate()}</span>
      </button>
    `);
  }
  document.getElementById("dateScroll").innerHTML = list.join("");
}

function selectDate(iso) {
  bookingState.date = iso;
  bookingState.time = null;
  document.querySelectorAll(".date-btn").forEach((button) => button.classList.remove("selected"));
  const target = Array.from(document.querySelectorAll(".date-btn")).find((button) => button.getAttribute("onclick") === `selectDate('${iso}')`);
  target?.classList.add("selected");
  document.getElementById("btnNextFromDateTime").disabled = true;
  renderTimeGrid();
}

async function renderTimeGrid() {
  const container = document.getElementById("timeGrid");
  container.innerHTML = `<div class="text-sm text-sub">Carregando horarios...</div>`;

  if (!bookingState.date || !bookingState.serviceId) {
    container.innerHTML = renderEmptyState("Escolha servico e data para ver horarios.");
    return;
  }

  const service = state.publicData.services.find((item) => item.id === bookingState.serviceId);
  const slots = generateTimeSlotsForDate(bookingState.date, state.publicData.hours);
  const availability = await Promise.all(
    slots.map(async (slot) => ({
      slot,
      available: await checkSlotAvailability(slot),
    }))
  );

  if (!availability.length) {
    container.innerHTML = renderEmptyState("Nao ha horarios disponiveis nessa data.");
    return;
  }

  container.innerHTML = availability
    .map(
      ({ slot, available }) => `
        <button class="time-btn" type="button" ${available ? "" : "disabled"} onclick="selectTime('${slot}')">${slot}</button>
      `
    )
    .join("");
}

async function checkSlotAvailability(slot) {
  if (!state.publicData.business) return false;
  const client = getSupabaseClient();
  const professionalId = bookingState.profId === 0 ? null : bookingState.profId;
  const { data, error } = await client.rpc("is_slot_available", {
    p_business_id: state.publicData.business.id,
    p_service_id: bookingState.serviceId,
    p_professional_id: professionalId,
    p_date: bookingState.date,
    p_time: slot,
  });
  if (error) {
    console.error(error);
    return false;
  }
  return Boolean(data);
}

function selectTime(slot) {
  bookingState.time = slot;
  document.querySelectorAll(".time-btn").forEach((button) => button.classList.remove("selected"));
  const target = Array.from(document.querySelectorAll(".time-btn")).find((button) => button.textContent === slot);
  target?.classList.add("selected");
  document.getElementById("btnNextFromDateTime").disabled = !bookingState.date || !bookingState.time;
}

function fillSummary() {
  const service = state.publicData.services.find((item) => item.id === bookingState.serviceId);
  const professional = state.publicData.professionals.find((item) => item.id === bookingState.profId);
  document.getElementById("sumService").textContent = service?.name || "—";
  document.getElementById("sumProf").textContent = professional ? `${professional.emoji || "👤"} ${professional.name}` : "Primeiro disponivel";
  document.getElementById("sumDate").textContent = bookingState.date ? formatLongDate(bookingState.date) : "—";
  document.getElementById("sumTime").textContent = bookingState.time || "—";
  document.getElementById("sumDuration").textContent = service ? `${service.duration} minutos` : "—";
  document.getElementById("sumPrice").textContent = service ? formatCurrency(service.price) : "—";
}

async function confirmBooking() {
  const name = document.getElementById("clientName").value.trim();
  const phone = document.getElementById("clientPhone").value.trim();
  const notes = document.getElementById("clientNotes").value.trim();
  const service = state.publicData.services.find((item) => item.id === bookingState.serviceId);
  const professional = state.publicData.professionals.find((item) => item.id === bookingState.profId);

  if (!name || !phone || !bookingState.date || !bookingState.time || !service) {
    showToast("Preencha seus dados e escolha um horario valido.");
    return;
  }

  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { error } = await client.from("appointments").insert({
      business_id: state.publicData.business.id,
      service_id: service.id,
      professional_id: professional?.id || null,
      client_name: name,
      client_phone: phone,
      client_notes: notes,
      appointment_date: bookingState.date,
      appointment_time: bookingState.time,
      status: "pendente",
    });
    if (error) throw error;

    document.querySelectorAll("#publicShell .page").forEach((page) => {
      page.classList.remove("active");
      page.classList.add("hidden");
    });

    document.getElementById("successService").textContent = service.name;
    document.getElementById("successProf").textContent = professional ? `${professional.emoji || "👤"} ${professional.name}` : "Primeiro disponivel";
    document.getElementById("successDateTime").textContent = `${formatLongDate(bookingState.date)} as ${bookingState.time}`;

    const success = document.getElementById("pubSuccess");
    success.classList.remove("hidden");
    success.style.display = "flex";

    window._lastBooking = {
      name,
      phone,
      notes,
      service,
      professional,
      date: formatLongDate(bookingState.date),
      time: bookingState.time,
      business: state.publicData.business,
    };
  } catch (error) {
    console.error(error);
    showToast(getFriendlyAppointmentError(error));
  } finally {
    showLoading(false);
  }
}

function sendWAConfirmation() {
  const booking = window._lastBooking;
  if (!booking) return;
  const message = `Ola, ${booking.name}! Seu agendamento foi reservado com sucesso em ${booking.business.name}.\n\n` +
    `Servico: ${booking.service.name}\n` +
    `Profissional: ${booking.professional ? booking.professional.name : "Primeiro disponivel"}\n` +
    `Data: ${booking.date}\n` +
    `Horario: ${booking.time}\n` +
    `Endereco: ${booking.business.address || "Nao informado"}\n\n` +
    `Se precisar remarcar, fale conosco pelo WhatsApp.`;
  window._waMsg = message;
  document.getElementById("waMessageText").textContent = message;
  openModal("modalWAMsg");
}

function copyWAMsg() {
  navigator.clipboard.writeText(window._waMsg || "").then(() => showToast("Mensagem copiada."));
}

function copyLink() {
  navigator.clipboard.writeText(document.getElementById("bizLink").textContent).then(() => showToast("Link copiado."));
}

function shareWhatsApp() {
  const link = document.getElementById("bizLink").textContent;
  const text = encodeURIComponent(`Agende seu horario comigo: ${link}`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

function openHostedPublicPage() {
  if (!state.business?.slug) {
    showToast("Salve o negocio para gerar o link publico.");
    return;
  }
  window.open(getPublicAppUrl(state.business.slug), "_blank");
}

async function deleteAppointment() {
  if (!state.selectedAppointment) return;
  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { error } = await client.from("appointments").delete().eq("id", state.selectedAppointment.id);
    if (error) throw error;
    closeModal("modalApptDetail");
    state.selectedAppointment = null;
    showToast("Agendamento excluido com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function confirmDeleteAppointment() {
  if (!state.selectedAppointment) return;
  openConfirmActionModal({
    title: "Excluir agendamento",
    message: `Deseja excluir o agendamento de "${state.selectedAppointment.client_name}"? Essa ação não poderá ser desfeita.`,
    confirmLabel: "Excluir agendamento",
    confirmClass: "btn btn-danger",
    onConfirm: deleteAppointment,
  });
}

function openBusinessWhatsApp() {
  const phone = onlyDigits(state.publicData.business?.whatsapp || "");
  if (!phone) {
    showToast("WhatsApp nao configurado.");
    return;
  }
  window.open(`https://wa.me/55${phone}`, "_blank");
}

function openBusinessInstagram() {
  const handle = (state.publicData.business?.instagram || "").replace(/^@/, "");
  if (!handle) {
    showToast("Instagram nao configurado.");
    return;
  }
  window.open(`https://instagram.com/${handle}`, "_blank");
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  if (id === "modalConfirmAction") {
    state.pendingConfirmAction = null;
  }
}

function showScreen(id) {
  ["landingPage", "loginPage", "setupPage", "blockedPage", "adminShell", "publicShell"].forEach((screenId) => {
    document.getElementById(screenId).classList.toggle("hidden", screenId !== id);
  });
  if (id === "landingPage") {
    applyBodyMode("landing");
  } else if (id === "loginPage" || id === "setupPage" || id === "blockedPage") {
    applyBodyMode("auth");
  } else if (id === "publicShell") {
    applyBodyMode("public");
  }
}

function showLoading(active) {
  document.getElementById("loadingOverlay").classList.toggle("hidden", !active);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function setTodayDate() {
  const date = new Date();
  document.getElementById("todayDate").textContent = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function toggleHourInputs(dayOfWeek) {
  const active = document.getElementById(`hour-active-${dayOfWeek}`).checked;
  document.getElementById(`hour-open-${dayOfWeek}`).disabled = !active;
  document.getElementById(`hour-close-${dayOfWeek}`).disabled = !active;
}

function getPendingSetup() {
  try {
    const raw = localStorage.getItem("agendafacil_pending_setup");
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

function getPendingSetupFromMetadata() {
  if (isInternalSupportAccount()) {
    return null;
  }
  const pending = state.user?.user_metadata?.pending_business;
  if (!pending?.name || !pending?.slug) {
    return null;
  }
  return {
    name: pending.name,
    slug: slugify(pending.slug),
    category: pending.category || "Salao de Beleza",
  };
}

async function handleBusinessLogoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.business = { ...(state.business || {}), logo_image_url: dataUrl };
    applyBusinessPreview(state.business);
    showToast("Logo carregada. Clique em salvar para gravar.");
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel carregar a logo.");
  }
}

async function handleBusinessCoverUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.business = { ...(state.business || {}), cover_image_url: dataUrl };
    applyBusinessPreview(state.business);
    showToast("Foto de capa carregada. Clique em salvar para gravar.");
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel carregar a capa.");
  }
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isSupportAccountEmail(email) {
  return String(email || "").trim().toLowerCase() === SUPPORT_ACCOUNT_EMAIL;
}

function isInternalSupportAccount() {
  return state.isPlatformAdmin && isSupportAccountEmail(state.user?.email);
}

function isSupportInternalBusiness(business) {
  return isSupportAccountEmail(business?.owner_email);
}

function syncSignupFormMode() {
  const isSupportSignup = isSupportAccountEmail(document.getElementById("signupEmail")?.value);
  const businessFields = document.getElementById("signupBusinessFields");
  const supportNote = document.getElementById("supportSignupNote");
  const submitButton = document.getElementById("signupSubmitButton");
  const businessName = document.getElementById("signupBusinessName");
  const slug = document.getElementById("signupSlug");

  if (!businessFields || !supportNote || !submitButton || !businessName || !slug) {
    return;
  }

  businessFields.classList.toggle("hidden", isSupportSignup);
  supportNote.classList.toggle("hidden", !isSupportSignup);
  businessName.required = !isSupportSignup;
  slug.required = !isSupportSignup;
  submitButton.textContent = isSupportSignup ? "Criar conta de suporte" : "Criar conta e negócio";
}

function applyBodyMode(mode) {
  document.body.classList.remove("body-landing", "body-auth", "body-public", "body-app", "body-support");
  document.body.classList.add(`body-${mode}`);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function formatLongDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatDateShort(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function getTopServiceName() {
  const counts = new Map();
  state.appointments.forEach((appointment) => {
    counts.set(appointment.service_id, (counts.get(appointment.service_id) || 0) + 1);
  });
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return top ? findService(top[0])?.name || "-" : "-";
}

function getTopProfessionalName() {
  const counts = new Map();
  state.appointments.forEach((appointment) => {
    if (appointment.professional_id) {
      counts.set(appointment.professional_id, (counts.get(appointment.professional_id) || 0) + 1);
    }
  });
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return top ? findProfessional(top[0])?.name || "-" : "-";
}

function formatHoursSummary(hours) {
  const activeHours = (hours || []).filter((item) => item.active && item.open_time && item.close_time);
  if (!activeHours.length) return "Horarios sob consulta";
  const first = activeHours[0];
  const last = activeHours[activeHours.length - 1];
  return `${formatTime(first.open_time)}-${formatTime(last.close_time)}`;
}

function applyBusinessPreview(business) {
  const avatar = document.getElementById("bizAvatarPreview");
  const cover = document.getElementById("bizCoverPreview");
  const logoImage = business?.logo_image_url || "";
  const coverImage = business?.cover_image_url || "";
  const emoji = business?.logo_emoji || "✂️";

  if (avatar) {
    avatar.style.backgroundImage = logoImage ? `url(${logoImage})` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.style.color = logoImage ? "transparent" : "var(--brand)";
    avatar.textContent = logoImage ? "" : emoji;
  }

  if (cover) {
    cover.style.backgroundImage = coverImage ? `linear-gradient(rgba(30,27,75,.15), rgba(30,27,75,.15)), url(${coverImage})` : "";
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
  }
}

function toggleCardMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isOpen = menu.classList.contains("open");
  document.querySelectorAll(".card-menu").forEach((item) => item.classList.remove("open"));
  if (!isOpen) {
    menu.classList.add("open");
  }
}

function generateTimeSlotsForDate(date, hours) {
  const day = new Date(`${date}T12:00:00`).getDay();
  const rule = (hours || []).find((item) => Number(item.day_of_week) === day && item.active);
  if (!rule || !rule.open_time || !rule.close_time) {
    return [];
  }

  const slots = [];
  let [hour, minute] = rule.open_time.slice(0, 5).split(":").map(Number);
  const [closeHour, closeMinute] = rule.close_time.slice(0, 5).split(":").map(Number);
  while (hour < closeHour || (hour === closeHour && minute < closeMinute)) {
    slots.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    minute += 30;
    if (minute >= 60) {
      hour += 1;
      minute -= 60;
    }
  }
  return slots;
}

function findService(id) {
  return state.services.find((item) => item.id === id) || state.publicData.services.find((item) => item.id === id);
}

function findProfessional(id) {
  return state.professionals.find((item) => item.id === id) || state.publicData.professionals.find((item) => item.id === id);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatBrazilPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderEmptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function getErrorMessage(error) {
  return error?.message || "Algo deu errado. Tente novamente.";
}

function getFriendlyAppointmentError(error) {
  const message = String(error?.message || "");
  if (
    message.includes("Horario indisponivel") ||
    message.includes("Nao existe profissional disponivel") ||
    message.includes("Horario fora do expediente") ||
    message.includes("fechado nesta data")
  ) {
    return message;
  }
  return getErrorMessage(error);
}

function resetServiceModal() {
  state.editingServiceId = null;
  document.getElementById("serviceModalTitle").textContent = "Novo Serviço";
  document.getElementById("serviceModalSaveBtn").textContent = "Salvar Serviço";
  document.getElementById("newServiceName").value = "";
  document.getElementById("newServiceDescription").value = "";
  document.getElementById("newServiceCategory").value = "Corte";
  document.getElementById("newServicePrice").value = "";
  document.getElementById("newServiceDuration").value = "";
  document.getElementById("newServiceIcon").value = "";
  document.getElementById("newServiceActive").checked = true;
}

function resetProfessionalModal() {
  state.editingProfessionalId = null;
  document.getElementById("professionalModalTitle").textContent = "Novo Profissional";
  document.getElementById("professionalModalSaveBtn").textContent = "Salvar";
  document.getElementById("newProfName").value = "";
  document.getElementById("newProfRole").value = "";
  document.getElementById("newProfEmoji").value = "";
  Array.from(document.getElementById("newProfServices").options).forEach((option) => {
    option.selected = false;
  });
  document.getElementById("newProfActive").checked = true;
}

function resetAppointmentModal() {
  state.editingAppointmentId = null;
  document.getElementById("apptModalTitle").textContent = "Novo Agendamento";
  document.getElementById("apptModalSaveBtn").textContent = "Salvar Agendamento";
  document.getElementById("newApptClient").value = "";
  document.getElementById("newApptPhone").value = "";
  document.getElementById("newApptService").value = "";
  document.getElementById("newApptProfessional").value = "";
  document.getElementById("newApptDate").value = "";
  document.getElementById("newApptTime").value = "";
}

function openServiceModal() {
  resetServiceModal();
  openModal("modalNovoServico");
}

function closeServiceModal() {
  closeModal("modalNovoServico");
  state.supportContextBusinessId = null;
  resetServiceModal();
}

function editService(serviceId) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;
  state.editingServiceId = serviceId;
  document.getElementById("serviceModalTitle").textContent = "Editar Serviço";
  document.getElementById("serviceModalSaveBtn").textContent = "Salvar Alterações";
  document.getElementById("newServiceName").value = service.name || "";
  document.getElementById("newServiceDescription").value = service.description || "";
  document.getElementById("newServiceCategory").value = service.category || "Corte";
  document.getElementById("newServicePrice").value = service.price || "";
  document.getElementById("newServiceDuration").value = service.duration || "";
  document.getElementById("newServiceIcon").value = service.icon || "";
  document.getElementById("newServiceActive").checked = Boolean(service.active);
  openModal("modalNovoServico");
}

async function toggleServiceActive(serviceId) {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;

  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { error } = await client.from("services").update({ active: !service.active }).eq("id", serviceId);
    if (error) throw error;
    showToast(service.active ? "Servico desativado com sucesso." : "Servico reativado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function openProfessionalModal() {
  resetProfessionalModal();
  openModal("modalNovoProf");
}

function closeProfessionalModal() {
  closeModal("modalNovoProf");
  state.supportContextBusinessId = null;
  resetProfessionalModal();
}

function editProfessional(professionalId) {
  const professional = state.professionals.find((item) => item.id === professionalId);
  if (!professional) return;
  state.editingProfessionalId = professionalId;
  document.getElementById("professionalModalTitle").textContent = "Editar Profissional";
  document.getElementById("professionalModalSaveBtn").textContent = "Salvar Alterações";
  document.getElementById("newProfName").value = professional.name || "";
  document.getElementById("newProfRole").value = professional.role || "";
  document.getElementById("newProfEmoji").value = professional.emoji || "";
  document.getElementById("newProfActive").checked = Boolean(professional.active);
  const assignedServiceIds = new Set(
    state.professionalServices.filter((item) => item.professional_id === professionalId).map((item) => item.service_id)
  );
  Array.from(document.getElementById("newProfServices").options).forEach((option) => {
    option.selected = assignedServiceIds.has(option.value);
  });
  openModal("modalNovoProf");
}

async function toggleProfessionalActive(professionalId) {
  const professional = state.professionals.find((item) => item.id === professionalId);
  if (!professional) return;

  showLoading(true);
  try {
    const client = getSupabaseClient();
    const { error } = await client.from("professionals").update({ active: !professional.active }).eq("id", professionalId);
    if (error) throw error;
    showToast(professional.active ? "Profissional desativado com sucesso." : "Profissional reativado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function openConfirmActionModal({ title, message, confirmLabel, confirmClass, onConfirm }) {
  state.pendingConfirmAction = onConfirm;
  document.getElementById("confirmActionTitle").textContent = title;
  document.getElementById("confirmActionMessage").textContent = message;
  const button = document.getElementById("confirmActionButton");
  button.textContent = confirmLabel || "Confirmar";
  button.className = confirmClass || "btn btn-danger";
  openModal("modalConfirmAction");
}

function closeConfirmActionModal() {
  state.pendingConfirmAction = null;
  closeModal("modalConfirmAction");
}

async function runPendingConfirmAction() {
  const action = state.pendingConfirmAction;
  closeConfirmActionModal();
  if (typeof action === "function") {
    await action();
  }
}

function getPublicAppUrl(slug) {
  return `${APP_BASE_URL.replace(/\/$/, "")}/?slug=${slug}`;
}
