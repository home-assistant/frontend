#!/bin/bash
# Basic Docker Management scripts
# With this script you can build software, or enter an agnostic development environment and run commands interactively.



check_mandatory_tools(){
  if [ "x$(which docker)" == "x" ]; then
    echo "UNKNOWN - Missing docker binary! Are you sure it is installed and reachable?"
    exit 3
  fi

  docker info > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "UNKNOWN - Unable to talk to the docker daemon! Maybe the docker daemon is not running"
    exit 3
  fi
}

check_dev_image(){
  if [[ "$(docker images -q ${IMAGE_NAME}:$IMAGE_TAG 2> /dev/null)" == "" ]]; then
    echo "UNKNOWN - Can't find the development docker image ${IMAGE_NAME}:$IMAGE_TAG"
    while true; do
      read -p "Do you want to create it now?" yn
      case $yn in
          [Yy]* ) create_image; break;;
          [Nn]* ) exit 3;;
          * ) echo "Please answer y or n";;
      esac
    done
  fi
}

# Building the basic image for compiling the production frontend
create_image(){
  docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
}

#
# Execute interactive bash on basic image
#
run_bash_on_docker(){

  check_dev_image

  docker run -it \
    -v $PWD/:/frontend/ \
    -v /frontend/node_modules \
    -v /frontend/bower_components \
    ${IMAGE_NAME}:${IMAGE_TAG} /bin/bash
}

#
# Execute the basic image for compiling the production frontend
#
build_all(){

  check_dev_image

  docker run -it \
    -v $PWD/:/frontend/ \
    -v /frontend/node_modules \
    -v /frontend/bower_components \
    ${IMAGE_NAME}:${IMAGE_TAG} /bin/bash script/build_frontend

}

# Init Global Variable
IMAGE_NAME=home_assistant_fe_image
IMAGE_TAG=${2:-latest}

check_mandatory_tools

case "$1" in
    setup_env)
            create_image
            ;;
    bash)
            run_bash_on_docker
            ;;
    build)
            build_all
            ;;
    *)
            echo "NAME"
            echo " Docker Management."
            echo ""
            echo "SYNOPSIS"
            echo "  ${0} command [version]"
            echo ""
            echo "DESCRIPTION"
            echo " With this script you can build software, or enter an agnostic development environment and run commands interactively."
            echo ""
            echo " The command are:"
            echo "   setup_env    Create develop images"
            echo "   bash         Run bash on develop enviroments"
            echo "   build        Run silent build"
            echo ""
            echo " The version is optional, if not inserted it assumes \"latest\". "
            exit 1
            ;;
esac
exit 0
