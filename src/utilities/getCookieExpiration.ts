const getCookieExpiration = (seconds = 7200) => {
  const cookieExpiration = new Date();
  const days = seconds / (60 * 60 * 24);
  cookieExpiration.setDate(cookieExpiration.getDate() + days);
  return cookieExpiration;
};

export default getCookieExpiration;
