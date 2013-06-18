RUSH - PERFORMANCE TESTING
==========================

OBJECTIVES
----------
Rush system is already implemented as a component; and its performance has been benchmarked. The company aims to offer the system as a service, and new performance 
objetictives have been defined. The performance-testing effort will be based, thus, on the following performance objectives:

* Assess and re-execute the 'legacy' benchmark process
* Determine the performance of the system when componed by a unique agent and database
* Determine the optimum agent+database architecture for the new service deployed in the cloud
* Tune customizations


###Performance testing objectives

###Performance testing objectives

-  Verify that there is no performance degradation over the previous benchmark process
-	Measure the performance of a component-like composition
	* Request/second capacity 
	* Response time
	* Throughput
	* Redis queue filling/flushing rate
	* System performance
	* Process performance
-	Verify the ideal configuration of hw/sw for the upgrade to a service
    * Measure the performance for minimum deployment, scaling workers deployment, scaling entries deployment and HA playground deployment on the cloud (Amazon Web Services)
    * Analyse the results to determine the optimum deployment model on AWS for a given performance requirement
-	Verify the ideal customization of the OS properties to optimize the performance
