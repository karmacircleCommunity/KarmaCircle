import { Helmet } from "react-helmet-async";

interface ComponentHelmetProps {
  type?: string;
}

function ComponentHelmet({ type }: ComponentHelmetProps) {
  return type == "Organizations" ? (
    <Helmet>
      <title>NgoWorld | {type}</title>
      <meta
        name="description"
        content="This is the organizations page of NgoWorld, where you can find all the organizations in the community."
      />
      <link rel="canonical" href="/" />
    </Helmet>
  ) : type == "Events" ? (
    <Helmet>
      <title>NgoWorld | Events </title>
      <meta
        name="description"
        content="This is the events page of NgoWorld, where you can find all the events happening in the community."
      />
      <link rel="canonical" href="/" />
    </Helmet>
  ) : null;
}

export default ComponentHelmet;
