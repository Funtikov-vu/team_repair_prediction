import { createStyles, Header, Container, Group, Text, rem, Menu } from '@mantine/core';
import { AuthShowcase } from './AuthShowcase';
import Link from 'next/link';
import { IconApi, IconBook2, IconPresentation } from '@tabler/icons-react';

const useStyles = createStyles((theme) => ({
  header: {
    backgroundColor: theme.fn.variant({ variant: 'filled', color: theme.primaryColor }).background,
    borderBottom: 0,
  },

  inner: {
    height: rem(56),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  links: {
    [theme.fn.smallerThan('sm')]: {
      // display: 'none',
      transform: 'scale(0.75)',
    },
    color: theme.white,
  },

  burger: {
    [theme.fn.largerThan('sm')]: {
      display: 'none',
    },
  },

  link: {
    display: 'block',
    lineHeight: 1,
    padding: `${rem(8)} ${rem(12)}`,
    borderRadius: theme.radius.sm,
    textDecoration: 'none',
    color: theme.white,
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: theme.fn.lighten(
        theme.fn.variant({ variant: 'filled', color: theme.primaryColor }).background!,
        0.1
      ),
    },
  },

  linkLabel: {
    marginRight: rem(5),
  },
}));

type HeaderLink = { link: string; label: string };
export type HeaderLinks = [HeaderLink] | [HeaderLink, ...HeaderLink[]];
interface HeaderSimpleProps {
  links: HeaderLinks;
}

const defaultLinks: HeaderLinks = [
  {
    "link": "/",
    "label": "Home",
  },
  {
    "link": "/profile",
    "label": "Profile",
  },

  {
    "link": "/data",
    "label": "Data",
  },
];

export function HeaderSimple({ links = defaultLinks }) {
  const { classes, cx } = useStyles();

  const items = links.map((link) => (
    <Link
      key={link.label}
      href={link.link}
      className={cx(classes.link)}
    >
      {link.label}
    </Link>
  ));

  const menu = <Menu shadow="md" width={170} trigger="hover" openDelay={100} closeDelay={200}>
    <Menu.Target>
      <a className={cx(classes.link)}>Docs</a>
    </Menu.Target>

    <Menu.Dropdown>
      {/* <Menu.Label>Docs</Menu.Label> */}
      <Menu.Item icon={<IconApi size={14} />} component={Link} href='/api-docs' prefetch={true}>API</Menu.Item>
      <Menu.Item icon={<IconBook2 size={14} />} component='a' 
        href='https://docs.google.com/document/d/1Q5_j9p0USTPmeIf2JIoqQxdTch2TvCVS54WjHcjOW_g'>Документация</Menu.Item>
      <Menu.Item icon={<IconPresentation size={14} />} component='a' 
        href='https://docs.google.com/presentation/d/1rUrK29y0N2JW00jchal-9AL8Ugzgi6ce'>Презентация</Menu.Item>
    </Menu.Dropdown>
  </Menu>;

  return (
    <Header height={60} mb={1} className={classes.header}>
      <Container className={classes.inner}>
        <Text color='white'><b><Link href='/' style={{ textDecoration: 'none', color: 'white' }}>City-helper</Link></b></Text>
        <Group spacing={5} className={cx(classes.links)}>
          {items}
          {menu}
          <AuthShowcase classes={classes} cx={cx}/>
        </Group>
      </Container>
    </Header>
  );
}