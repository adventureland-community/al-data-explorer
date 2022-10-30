We want a searchable item interface
it should be a grid, with stats as columns, we should be able to filter my stat attribute.

- go to https://github.com/adventureland-community/typed-adventureland
- download the code
- run `npm run build | npm run pack`
- copy the produced .tgz to the root of this project and run the below command to install the types
`npm install --save-dev adventureland@typed-adventureland-0.0.2.tgz`


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).



# stats data collection
rogue, lvl 69

equipping 
+4 str gives +4 armor, +4 str and +84 hp, 21 hp per +1
+4 dex gives +1 runspeed, +1 attack speed, 0,25 per +1
+4 int gives +60 mp (15 per +1), +4 resist (0,25 per +1)
+3 vit gives 213 hp, 71 hp per +1
+5 vit gives 355 hp, 71 hp per +1
+7 vit gives 497 hp, 71 hp per +1

"naked" stats
hp 4586
mp 1035

"int": 27,
"str": 31,
"dex": 132,
"vit": 45,
"for": 14,
"attack": 115,
"heal": 0,
"frequency": 1.0966245644599302,
"speed": 36,
"range": 15,
"armor": 60,
"resistance": 44,
"evasion": 0,
"miss": 0,
"reflection": 0,
"lifesteal": 0,
"manasteal": 0,
"rpiercing": 0,
"apiercing": 2,
"crit": 0,
"critdamage": 0,
"dreturn": 0.5,
"tax": 0.025,
"xrange": 25,
"pnresistance": 0,
"firesistance": 0,
"fzresistance": 10,
"phresistance": 0,
"stresistance": 0,
"incdmgamp": 0,
"stun": 0,
"blast": 0,
"explosion": 0,
"courage": 2,
"mcourage": 2,
"pcourage": 2,
"fear": 0,
"ref_speed": 55,

lvl 1 warrior, hp is 200 from class, so that should be 424 from str and vit
hp: 624 with ringsj = 687 (+63 for +3 str, 21 per str) 
mp: 55 with ringsj = 100
int: 2 with ringsj = 5
str: 11 with ringsj = 14
dex: 2 with ringsj = 5
vit: 4 
armor: 31 with ringsj = 34
resistance: 4 with ringsj = 22
attack: 63 with ringsj = 64
speed: 55

so hp = 624-200 = 424
11 str * 21 = 231
that leaves 424-231 = 193 health left for vit, unless a plain lvl up also increases hp
193 / 4 = 48,25 per vit

at lvl 6 
hp 836 = 636 - 336 = 300
vit 6 = 300 / 6 = 50 per vit 
str 16 = 21 * 16 = 336
