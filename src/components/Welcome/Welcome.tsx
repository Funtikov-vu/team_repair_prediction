import { Title, Text, Anchor } from '@mantine/core';
import useStyles from './Welcome.styles';

export function Welcome() {
  const { classes } = useStyles();

  return (
    <>
      <Title className={classes.title} align="center" mt={100}>
        Добро пожаловать в{' '}
        <Text inherit variant="gradient" component="span">
          ЖКХ
        </Text>
      </Title>
      <Text color="dimmed" align="center" size="lg" sx={{ maxWidth: 580 }} mx="auto" mt="xl">
        Войдите в систему, чтобы получить доступ к личному кабинету. Начните работу на вкладке Profile или Data.
      </Text>
    </>
  );
}
