var findEligibilityForSNAP = function (simple, people, income, depChildExpenses, shelter, utilities, medical, hasSSID) {
	// determine whether the user is eligible for food stamps based on inputs. 
	// simple is a bollean. true indicates that were are performing the simplified calculation estimated toward the beginning of the survey
	// people is an integer and the number of people in household
	// income is total income of household
	// depChildExpenses is total dependant or child care expenses including child support
	// shelter is amount in shelter expenses
	// utilities is amount in utilities expenses
	// medical is amount in medical expenses
	// hasSSID is a boolean that indicates whether the user has an individual in their household that receives SSI or SSD

	var eligibility 
	if (simple) {
	//simple is for the quick estimation on income at the top of the app
		shelter = 835;
		utilities = 0;
		eligibility = determineEligibilty(income, shelter, utilities, depChildExpenses, people, 0, false);
		return eligibility;
	}

	if (shelter > (income/2)) {
		shelter -= income/2;
	}
	else {
		shelter = 0;
	}

	if (utilities > 345) {
	//utilties standard deduction of 345
		utilties = 345;
	}

	if (hasSSID) {
	//if user has household member who recieves SSI or SSD, medical expenses are deductible aboove $35
	//and there is not limit on the shelter deduction.
		if (medical > 35) {
			medical -= 35;
		} 
		else {
			medical = 0;
		}
	
		eligibility = determineEligibilty(income, shelter, utilities, depChildExpenses, people, medical, hasSSID);
		return eligibility;
	}

	// if user does not have a household member who recieves SSI or SSD, there is a limit on shelter deduction of $490
	if (shelter > 490) {
		shelter = 490;
	}

	eligibility = determineEligibilty(income, shelter, utilities, depChildExpenses, people, 0, hasSSID);
	return eligibility;

};


var findSizeDeduct = function (people) {
	//determine the monthly deduction for SNAP eligibility for a family of "size" people
	var sizeDeduct;
	if (people >=1 && people <=3) {
		sizeDeduct = 155;
	}
	else if (people == 4){
		sizeDeduct = 165;
	}
	else if (people == 5) {
		sizeDeduct = 193;
	} 
	else if (people > 5) {
		sizeDeduct = 221;
	}
	return sizeDeduct;
}

var determineEligibilty = function (income, shelter, utilities, depChildExpenses, people, medical, hasSSID) {
	// equation to determine eligibility for SNAP. depending on whether the user has a household member who
	// recieves SSI or SSD.
	
	var sizeDeduct = findSizeDeduct(people);

	var netIncome = income - shelter - utilities - depChildExpenses - 0.2*income - sizeDeduct - medical;

	if (hasSSID) {
		var baseAmount = 634;
		var perPerson = 338.5;
	}
	else {
		var baseAmount = 825;
		var perPerson = 440;
	}

	if (netIncome <= (baseAmount + people*perPerson)) {
		return true;
	}
	else {
		return false;
	}

}