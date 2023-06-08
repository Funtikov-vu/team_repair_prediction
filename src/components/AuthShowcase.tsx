import { Button, Container, Group } from "@mantine/core";
import { signIn, signOut, useSession } from "next-auth/react";

export const AuthShowcase = ({classes, cx}) => {
  const { data: sessionData } = useSession();

  return (
    <Group>
      <Container className={cx(classes.links)}>
        {/* {sessionData && <span>Logged in as {sessionData.user?.name}</span>} */}
      </Container>
      <Button className={cx(classes.link)}
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Выход" : "Вход"}
      </Button>
    </Group>
  );
};