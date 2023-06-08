import { useSession } from "next-auth/react";
import { AuthMessage } from "~/components/AuthMessage";
import { HeaderSimple } from "~/components/HeaderSimple";

export default function ApiDoc() {
  const { data: session } = useSession();
  return <>  
    <HeaderSimple />
    <AuthMessage session={session} />
    {session && <iframe src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/docs`} width="100%" height="100%" frameBorder="0" 
      style={{ position: "absolute"}}
    />}
  </>
}