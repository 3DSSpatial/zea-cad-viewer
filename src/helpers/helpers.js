const { Color, GLRenderer, Scene, MathFunctions } = window.zeaEngine

export const getRamdomUser = async () => {
  // const res = await window.superagent.get('https://randomuser.me/api')

  // const randomUser = res.body.results[0]

  // const userId = randomUser.login.uuid

  // const userData = {
  //   color: Color.random().toHex(),
  //   family_name: randomUser.name.first,
  //   given_name: randomUser.name.last,
  //   id: userId,
  //   picture: `https://avatars.dicebear.com/api/human/${userId}.svg?mood[]=happy`,
  // }

  const color = Color.random()
  const firstNames = ['Phil', 'Froilan', 'Alvaro', 'Dan', 'Mike', 'Rob', 'Steve']
  const lastNames = ['Taylor', 'Smith', 'Haines', 'Moore', 'Elías Pájaro Torreglosa', 'Moreno']
  const userData = {
    given_name: firstNames[MathFunctions.randomInt(0, firstNames.length)],
    family_name: lastNames[MathFunctions.randomInt(0, lastNames.length)],
    id: Math.random().toString(36).slice(2, 12),
    color: color.toHex(),
  }
  return userData
}

export const getAppData = (canvas) => {
  const renderer = new GLRenderer(canvas)
  const scene = new Scene()

  // scene.setupGrid(10, 10)
  renderer.setScene(scene)

  const appData = {
    scene,
    renderer,
  }

  return appData
}
