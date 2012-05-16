set -e
TAG=$1
SCRPT=$2
rm -rf BRANCH
mkdir BRANCH
rm -f $TAG
wget --no-check-certificate https://github.com/mrutid/Rush/zipball/$TAG
unzip -d BRANCH -u $TAG
NODE_DIR=`ls BRANCH` 
if [ -e "${SCRPT}.pid" ]
then
pid2kill=`cat ${SCRPT}.pid`
kill -9 $pid2kill
rm ${SCRPT}.pid
fi
pushd BRANCH/${NODE_DIR}
npm install
node $SCRPT &
SPID=$!
popd
ps -fp  $SPID
echo $SPID > ${SCRPT}.pid
