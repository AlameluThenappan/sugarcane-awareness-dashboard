import { supabase } from "../lib/supabaseClient";

export type PendingVerifier = { id: string; username: string; email: string };
export type ActiveVerifier  = { id: string; username: string; email: string };

export async function getPendingVerifiers(): Promise<PendingVerifier[]> {
  const { data, error } = await supabase.rpc("list_pending_verifiers");
  if (error) throw error;
  return data ?? [];
}

export async function getActiveVerifiers(): Promise<ActiveVerifier[]> {
  const { data, error } = await supabase.rpc("list_active_verifiers");
  if (error) throw error;
  return data ?? [];
}

export async function approveVerifier(id: string, email: string) {
  const { data: token, error } = await supabase.rpc("approve_verifier", { p_profile_id: id });
  if (error) throw error;

  const { error: fnError } = await supabase.functions.invoke("send-approval-email", {
    body: { email, token },
  });
  if (fnError) throw fnError;
}

export async function rejectVerifier(id: string) {
  const { error } = await supabase.rpc("reject_verifier", { p_profile_id: id });
  if (error) throw error;
}

export async function removeVerifier(id: string) {
  const { error } = await supabase.rpc("remove_verifier", { p_profile_id: id });
  if (error) throw error;
}