// Small data layer over Supabase. The app calls these; they handle the SQL.
import { supabase } from "./supabaseClient";

const num = (v) => (Number(v) || 0);

/* ── auth ── */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}
export function signOut() {
  return supabase.auth.signOut();
}

/* ── load ── */
export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // first time for this user → create a default profile
  const def = { user_id: userId, has_setup: false };
  const { data: created, error: e2 } = await supabase
    .from("profiles").insert(def).select().single();
  if (e2) throw e2;
  return created;
}
export async function loadDebts(userId) {
  const { data, error } = await supabase.from("debts").select("*").eq("user_id", userId);
  if (error) throw error;
  return data || [];
}
export async function loadExpenses(userId) {
  const { data, error } = await supabase.from("expenses").select("*").eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

/* ── save ──
   Debts/expenses use upsert (insert-or-update), which never touches rows it
   isn't given — so two saves overlapping (e.g. a debounced save and a
   leave-the-tab save firing close together) can never wipe data. Removing a
   single item is a separate, explicit delete fired the moment it happens. */
export async function saveProfile(userId, fields) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}
export async function upsertDebts(userId, debts) {
  if (!debts.length) return;
  const rows = debts.map((d) => ({
    user_id: userId, id: d.id, name: d.name, type: d.type,
    balance: num(d.balance), apr: num(d.apr), min: num(d.min), due: parseInt(d.due) || 1,
  }));
  const { error } = await supabase.from("debts").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw error;
}
export async function deleteDebt(userId, id) {
  const { error } = await supabase.from("debts").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
export async function upsertExpenses(userId, expenses) {
  if (!expenses.length) return;
  const rows = expenses.map((e) => ({ user_id: userId, id: e.id, name: e.name, amount: num(e.amount) }));
  const { error } = await supabase.from("expenses").upsert(rows, { onConflict: "user_id,id" });
  if (error) throw error;
}
export async function deleteExpense(userId, id) {
  const { error } = await supabase.from("expenses").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
