"use strict";

const byId = (id) => document.getElementById(id);
const signIn = byId("sign-in");
const signOut = byId("sign-out");
const changeAccount = byId("change-account");
const authStatus = byId("auth-status");
const panel = byId("panel");
const gate = byId("gate");
const account = byId("account");
const section = byId("section");
const query = byId("query");
const table = byId("listing-table");
const listStatus = byId("list-status");
const pagination = byId("pagination");
const previous = byId("previous");
const next = byId("next");
const promoDate = byId("promo-date");
const savePromo = byId("save-promo");
const endPromo = byId("end-promo");
const promoStatus = byId("promo-status");

const count = new Intl.NumberFormat("pt-BR");
const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });
const pageSize = 25;
let client;
let sessionVersion = 0;
let requestVersion = 0;
let activeUser;
let overview;
let search = { kind: "players", text: "", offset: 0 };

function formatDate(value) {
  const date = new Date(value || "");
  return Number.isFinite(date.getTime()) ? dateTime.format(date) : "—";
}

function priceLabel(row) {
  const currency = { COINS: "moedas", DIAMONDS: "diamantes" }[row.price_type] || row.price_type || "";
  return row.price == null ? "—" : [count.format(row.price), currency].filter(Boolean).join(" ");
}

const columns = {
  players: [["Nome", (row) => row.name], ["Nível", (row) => row.level], ["Último acesso", (row) => formatDate(row.last_login)]],
  clans: [["Nome", (row) => row.name], ["Pontos", (row) => count.format(row.points)], ["Criação", (row) => formatDate(row.created_at)]],
  catalogue: [["Nome", (row) => row.name], ["Tipo", (row) => row.kind === "character" ? "Personagem" : "Poder"], ["Preço base", priceLabel]]
};

function hidePanel() {
  activeUser = null;
  overview = null;
  panel.hidden = true;
  account.hidden = true;
  gate.hidden = false;
  table.hidden = true;
  table.tBodies[0].replaceChildren();
  pagination.hidden = true;
  promoDate.value = "";
  promoDate.disabled = false;
  savePromo.disabled = false;
  promoStatus.textContent = "";
  byId("email").textContent = "";
}

function accessDenied(error) {
  return error.code === "42501" || error.code === "PGRST301" || error.code === "PGRST303";
}

function showDenied() {
  sessionVersion++;
  hidePanel();
  signIn.hidden = true;
  changeAccount.hidden = false;
  authStatus.textContent = "Esta sessão não tem acesso ao painel. Entre com a conta Google autorizada.";
}

function promotionActive() {
  return overview?.free_until && Date.parse(overview.free_until) > Date.now();
}

function renderOverview(data) {
  overview = data;
  for (const key of ["players", "clans", "characters"]) {
    byId("stat-" + key).textContent = count.format(data[key]);
  }
  byId("promo-state").textContent = promotionActive()
    ? "Ativa até " + formatDate(data.free_until)
    : "Sem promoção ativa.";
  endPromo.disabled = !promotionActive();
}

async function loadSession(session, callbackFailed = false) {
  if (session && session.user.id === activeUser) return;

  const version = ++sessionVersion;
  hidePanel();
  signIn.hidden = false;
  changeAccount.hidden = true;
  signIn.disabled = Boolean(session);
  authStatus.textContent = callbackFailed
    ? "Não foi possível concluir o login. Tente novamente."
    : "";

  if (!session) return;

  authStatus.textContent = "Verificando o acesso…";
  const { data, error } = await client.rpc("atisq_admin_overview").abortSignal(AbortSignal.timeout(12000));
  if (version !== sessionVersion) return;

  if (error) {
    if (accessDenied(error)) {
      showDenied();
    } else {
      authStatus.textContent = "O painel está indisponível no momento. Recarregue a página para tentar novamente.";
      signIn.hidden = true;
      changeAccount.hidden = false;
    }
    return;
  }

  activeUser = session.user.id;
  byId("email").textContent = session.user.email;
  renderOverview(data);
  section.value = "players";
  query.value = "";
  gate.hidden = true;
  account.hidden = false;
  panel.hidden = false;
  byId("panel-title").focus();
  loadList({ kind: "players", text: "", offset: 0 });
}

async function loadList(filters) {
  const version = ++requestVersion;
  const session = sessionVersion;
  previous.disabled = true;
  next.disabled = true;
  table.hidden = true;
  pagination.hidden = true;
  listStatus.textContent = "Carregando registros…";
  const { data, error } = await client.rpc("atisq_admin_list", {
    p_kind: filters.kind,
    p_query: filters.text,
    p_offset: filters.offset
  }).abortSignal(AbortSignal.timeout(12000));

  if (version !== requestVersion || session !== sessionVersion) return;
  if (error) {
    if (accessDenied(error)) return showDenied();
    listStatus.textContent = "Não foi possível carregar os registros. Faça a busca novamente.";
    return;
  }

  search = filters;
  const fields = columns[filters.kind];
  const heading = document.createElement("tr");
  for (const [label] of fields) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    heading.append(cell);
  }
  table.tHead.replaceChildren(heading);
  const rows = data.slice(0, pageSize).map((record) => {
    const row = document.createElement("tr");
    for (const [, value] of fields) {
      row.insertCell().textContent = value(record) ?? "—";
    }
    return row;
  });
  table.tBodies[0].replaceChildren(...rows);
  table.hidden = rows.length === 0;
  listStatus.textContent = rows.length ? "" : "Nenhum registro encontrado.";
  pagination.hidden = filters.offset === 0 && data.length <= pageSize;
  byId("page").textContent = "Página " + (filters.offset / pageSize + 1);
  previous.disabled = filters.offset === 0;
  next.disabled = data.length <= pageSize;
}

async function updatePromotion(until) {
  const version = sessionVersion;
  savePromo.disabled = true;
  endPromo.disabled = true;
  promoDate.disabled = true;
  promoStatus.textContent = "Salvando…";

  const { error } = await client.rpc("atisq_admin_set_free_characters", {
    p_until: until,
    p_expected: overview.free_until
  }).abortSignal(AbortSignal.timeout(12000));
  if (version !== sessionVersion) return;
  if (error && accessDenied(error)) return showDenied();

  const refreshed = await client.rpc("atisq_admin_overview").abortSignal(AbortSignal.timeout(12000));
  if (version !== sessionVersion) return;
  if (refreshed.error && accessDenied(refreshed.error)) return showDenied();
  if (refreshed.data) renderOverview(refreshed.data);
  if (!error) promoDate.value = "";

  promoStatus.textContent = error?.code === "40001"
    ? "A promoção foi alterada em outra sessão. Confira o estado atual antes de salvar."
    : error?.code === "22023"
      ? "Escolha uma data de término futura."
      : error
        ? "Não foi possível confirmar a alteração. Confira o estado da promoção."
        : until ? "Término da promoção salvo." : "Promoção encerrada.";
  if (refreshed.error) {
    promoStatus.textContent += " Recarregue a página para consultar o estado atual.";
  }
  savePromo.disabled = Boolean(refreshed.error);
  endPromo.disabled = Boolean(refreshed.error) || !promotionActive();
  promoDate.disabled = false;
}

async function enter() {
  signIn.disabled = true;
  authStatus.textContent = "Conectando ao Google…";
  try {
    const { url, key } = window.atisqBackend;
    const response = await fetch(url + "/auth/v1/settings", {
      headers: { apikey: key },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error("Auth settings unavailable");
    const settings = await response.json();
    if (!settings.external?.google) {
      authStatus.textContent = "O login Google ainda não está ativo.";
      return;
    }
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: new URL("./", location.href).href,
        queryParams: { prompt: "select_account" },
        skipBrowserRedirect: true
      }
    });
    if (error || !data.url) throw new Error("OAuth start failed");
    location.assign(data.url);
  } catch {
    authStatus.textContent = "Não foi possível iniciar o login. Tente novamente.";
  } finally {
    signIn.disabled = false;
  }
}

async function leave(button) {
  button.disabled = true;
  const { error } = await client.auth.signOut({ scope: "local" });
  button.disabled = false;
  if (error) {
    sessionStorage.removeItem("atisq-admin-auth");
    location.replace(new URL("./", location.href));
  } else {
    loadSession(null);
    signIn.focus();
  }
}

async function start() {
  try {
    client = window.supabase.createClient(window.atisqBackend.url, window.atisqBackend.key, {
      auth: {
        flowType: "pkce",
        storageKey: "atisq-admin-auth",
        storage: sessionStorage,
        detectSessionInUrl: false
      }
    });
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    let failed = params.has("error") || params.has("error_code") || Boolean(location.hash);
    if (code || failed) history.replaceState(null, "", new URL("./", location.href));

    let session;
    if (code && !failed) {
      const result = await client.auth.exchangeCodeForSession(code);
      failed = Boolean(result.error);
      session = result.data.session;
    } else {
      const result = await client.auth.getSession();
      failed ||= Boolean(result.error);
      session = result.data.session;
    }
    await loadSession(session, failed);
    client.auth.onAuthStateChange((event, currentSession) => {
      if (event !== "INITIAL_SESSION") setTimeout(() => loadSession(currentSession), 0);
    });
  } catch {
    authStatus.textContent = "Não foi possível carregar o login. Recarregue a página para tentar novamente.";
  }
}

signIn.addEventListener("click", enter);
signOut.addEventListener("click", () => leave(signOut));
changeAccount.addEventListener("click", () => leave(changeAccount));
document.addEventListener("visibilitychange", () => {
  if (overview && !promoDate.disabled) endPromo.disabled = !promotionActive();
});
byId("filters").addEventListener("submit", (event) => {
  event.preventDefault();
  loadList({ kind: section.value, text: query.value.trim(), offset: 0 });
});
section.addEventListener("change", () => {
  query.value = "";
  loadList({ kind: section.value, text: "", offset: 0 });
});
previous.addEventListener("click", () => loadList({ ...search, offset: search.offset - pageSize }));
next.addEventListener("click", () => loadList({ ...search, offset: search.offset + pageSize }));
byId("promo-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (savePromo.disabled) return;
  const value = new Date(promoDate.value);
  if (!Number.isFinite(value.getTime()) || value.getTime() <= Date.now()) {
    promoStatus.textContent = "Escolha uma data de término futura.";
    return;
  }
  if (confirm("Salvar o término da promoção para " + formatDate(value) + "?")) {
    updatePromotion(value.toISOString());
  }
});
endPromo.addEventListener("click", () => {
  if (confirm("Encerrar a promoção agora e restaurar os preços dos personagens?")) updatePromotion(null);
});

start();
