import { Button, Container, Text } from "@mantine/core";
import { signIn, signOut, useSession } from "next-auth/react";
import { api } from "~/utils/api";

export const AuthShowcase: React.FC = () => {
  const { data: sessionData } = useSession();

  return (
    <>
      <Container>
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
      </Container>
      <Button
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </Button>
    </>
  );
};