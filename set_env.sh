# Arg 1: dev_local/dev/prod/stage
# Arg 2: Region

if [[ $1 == "dev_local" ]]
then
	echo "Switching to dev local environment...."
	FILE=".env.development.local"	
elif [[ $1 == "dev" ]]
then
	echo "Switching to dev remote environment...."
	FILE=".env.development.remote"
elif [[ $1 == "stage" ]]
then
	echo "Switching to stage environment...."
	FILE=".env.staging"
elif [[ $1 == "prod" ]]
then
	echo "Switching to prod us-east environment...."
	FILE=".env.production"
else
	echo "Error. Valid options are: dev_local, dev, prod, and stage"
	return
fi

if [[ $2 == "" ]]
then
	REGION="default"
else
	REGION=$2
fi

if [[ $REGION != "default"  ]]
then
	if [[ $1 == "dev" ]] || [[ $1 == "dev_local" ]]
	then
		echo "Error. Dev cannot be in a non-default region"
		return
	fi
fi

if [[ $REGION == "default" ]]
then
	echo "Default region"
	EXTENSION=".us_east"
elif [[ $REGION == "eu" ]]
then
	echo "Europe region"
	EXTENSION=".eu"
elif [[ $REGION == "cn" ]]
then
	echo "China region"
	EXTENSION=".cn"
else
	echo "Error. Valid region options are: default, eu, cn"
	return 
fi

FILE="$FILE$EXTENSION"

set -o allexport; source $FILE; set +o allexport
cp $FILE .env
