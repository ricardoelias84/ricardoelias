export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/nave/index.html',
      permanent: false,
    },
  };
}

export default function NaveRedirect() {
  return null;
}
