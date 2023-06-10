import { useSession } from "next-auth/react";
import { AuthMessage } from "~/components/AuthMessage";
import { HeaderSimple } from "~/components/HeaderSimple";

const Frame = () => {
  return <iframe src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/docs`} width="100%" height="100%" frameBorder="0" 
    style={{ position: "absolute"}}
  />
}

export default function ApiDoc() {
  const { data: session, status } = useSession();
  const authenticated = (status === 'authenticated' || status === 'loading');
  return <>  
    <HeaderSimple />
    <AuthMessage session={authenticated} />
    {session && <Frame />}
  </>
}