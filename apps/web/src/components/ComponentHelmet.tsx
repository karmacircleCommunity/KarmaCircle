import { Helmet } from "react-helmet-async";

interface ComponentHelmetProps {
  type?: string;
}

function ComponentHelmet({ type }: ComponentHelmetProps) {
  return type == "Organizations" ? (
    <Helmet>
      <title>KarmaCircle | {type}</title>
      <meta
        name="description"
        content="This is the organizations page of KarmaCircle, where you can find all the organizations in the community."
      />
      <link rel="canonical" href="/" />
    </Helmet>
  ) : type == "Events" ? (
    <Helmet>
      <title>KarmaCircle | Events </title>
      <meta
        name="description"
        content="This is the events page of KarmaCircle, where you can find all the events happening in the community."
      />
      <link rel="canonical" href="/" />
    </Helmet>
  ) : null;
}

export default ComponentHelmet;
