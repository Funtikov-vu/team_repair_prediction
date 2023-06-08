import { Center, Container, Stack, Title, Text } from "@mantine/core"

export const AuthMessage = ({session}) => {
  return <>
    {!session && <Center>
      <Container size="md">
        <Stack>
          <br />
          <br />
          <br />
          <Title align="center">Вы не авторизованы</Title>
          <Text>Для доступа к этой странице необходимо авторизоваться.</Text>
          {/* <AuthShowcase /> */}
        </Stack>
      </Container>
    </Center>}
  </>
}