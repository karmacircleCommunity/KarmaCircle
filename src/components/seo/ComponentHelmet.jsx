import { Helmet } from "react-helmet-async";

function ComponentHelmet({ type }) {
  return type == "Clubs" ? (
    <Helmet>
      <title>NgoWorld | {type}</title>
      <meta
        name="description"
        content="This is the clubs page of NgoWorld, where you can find all the clubs in the community."
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
