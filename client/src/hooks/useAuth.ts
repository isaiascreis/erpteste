import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Se há erro 401, usuário não está autenticado
  const isAuthenticated = !!user && !error;

  console.log("🔐 useAuth state:", { user, isLoading, error, isAuthenticated });

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
