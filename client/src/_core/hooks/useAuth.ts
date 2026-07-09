import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Whether the app is protected by APP_PASSWORD (shown as a login gate).
  const configQuery = trpc.auth.config.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const login = useCallback(
    (password: string) => loginMutation.mutateAsync({ password }),
    [loginMutation]
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading:
        meQuery.isLoading || configQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
      passwordRequired: configQuery.data?.passwordRequired ?? false,
      loginPending: loginMutation.isPending,
      loginError: loginMutation.error ?? null,
    }),
    [
      meQuery.data,
      meQuery.error,
      meQuery.isLoading,
      configQuery.data,
      configQuery.isLoading,
      loginMutation.isPending,
      loginMutation.error,
      logoutMutation.error,
      logoutMutation.isPending,
    ]
  );

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    login,
    logout,
  };
}
