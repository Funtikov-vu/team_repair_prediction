import { NextPage } from "next";
import Head from "next/head";
import { PropsWithChildren } from "react";

export default function HeadSimple({ title, description = "" }: { title: string, description?: string }) {
  return (
  <Head>
    <title>{title}</title> 
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.ico" />
  </Head>
)};

