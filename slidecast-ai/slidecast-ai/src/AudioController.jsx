useEffect(() => {
  if (!slide.audio) return;
  const audio = new Audio(slide.audio);
  audio.play();
  return () => audio.pause();
}, [slide]);
