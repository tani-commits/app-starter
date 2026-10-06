import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Thin client over the Stage 2 action layer. Every page calls actions through
// these hooks so loading/error/success states are handled consistently.
//
// base44.functions.invoke returns an Axios response; res.data is the action
// envelope { ok, status, data } or { ok: false, status, error }.
async function invoke(functionName, payload) {
  const res = await base44.functions.invoke(functionName, payload);
  const body = res.data;
  if (!body || body.ok === false) {
    const err = new Error(body?.error?.message || "Action failed");
    err.code = body?.error?.code;
    err.status = body?.status;
    throw err;
  }
  return body.data;
}

export function useActionQuery(functionName, payload, options = {}) {
  return useQuery({
    queryKey: [functionName, payload],
    queryFn: () => invoke(functionName, payload),
    ...options
  });
}

export function useActionMutation(functionName, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars) => invoke(functionName, vars),
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries();
      if (options.onSuccess) options.onSuccess(data, vars, ctx);
    },
    ...options
  });
}