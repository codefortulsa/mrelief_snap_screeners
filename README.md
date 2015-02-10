# Challenge - Build a Supplemental Nutrition Assistance Program (SNAP or food stamps) Eligibility Pre Screener

On February 20-22nd, mRelief (www.mrelief.com) will be part of a national event in partnership with Code For America (CFA) to build upon our work as the first Social Services Delivery SMS application for screening eligibility in the US. mRelief is a midwest based web and SMS application led by an all-woman web development team that helps users check their eligibility for public assistance. CFA organizes a network of people dedicated to making government services simple, effective, and easy to use.

We invite users all across the nation to push their food stamp pre-screeners for different states and target populations to this repository.  We also encourage meaningful collaboration with non-technical experts in the field engaged in food policy and advocacy.

The four key files we want each user to push from their state:
1. Code for prescreens (either SMS or web forms (preferably in Ruby))
2. Seeds File of Eligibility Data
3. Policy references to substantiate the questions asked in the prescreener
4. Lists of local food pantries in your state or area listing name, address and phone number, so we can refer people who are ineligible for foodstamps to a local food pantry

Our goal is to sustain this repository beyond the Hackathon in the efforts to provide SMS screening nationally.

## Challenge Overview

  * This is challenge is designed for at least one policy expert and developer to work on together. However, the more the better!
  * The challenge is designed to take 8 to 10 hours.  We estimate that it will take 4 hours to research food stamps eligibility and designed the questions for your target population.  The remainder of the time will be spend on developing the app.
  * To set up the event, organize a group of policy experts and developers!


## Challenge Outline

1. Before the event,
  * Sign up and let us know who will be participating
  * Connect with a local CBO partner that does SNAP application assistance. This will likely be your local Food Bank but many other organizations do this work, too. Learn how they currently screen clients for SNAP eligibility and if a SMS or online screener would be useful. Invite them to the event!
  * Here are some general guidelines on SNAP eligibility to review:  http://www.fns.usda.gov/snap/eligibility

2. During the event, start with some research
  * Figure out who is eligible for SNAP in your state. Keep in mind the following groups who should be able to determine their eligibility:
      * Elderly (people over 60)
      * Undocumented
      * Students
      * People with disabilities
  * Here is pre-screening resource to consider how you might model your questions: http://www.snap-step1.usda.gov/fns/
  * Talk to your CBO partner to figure out what screening questions are most relevant to the populations they serve.
  * Talk to your CBO partner about documents one must bring for caseworker interview and the best responses for eligible and ineligible users
  * Bonus - figure out how to estimate how much each person qualifies for

3. Write a SNAP screener!
  * Fork this sample codebase (https://github.com/mRelief/mrelief_snap_screener_example) and write a screener for your target population (either web or SMS)
    * If you decide to build an SMS screener, here is a link to Twilio's documentation - https://www.twilio.com/docs/
    * A 2010 report by Frost and Sullivan revealed that nearly everyone (90% of U.S. adults) has access to texting, more than any other communication medium.
  * Document your code, including notes about state specific policies
  * Buy a twilio number, deploy to heroku, and test it out!

4. Share it with us and the world! (screenshot + Tweet + PR + blog?)
  * Add your code to this repo SNAP screeners across the nation - https://github.com/mRelief/mrelief_snap_screeners


## Technical Overview of a SMS Pre-Screener

In order to build our eligibility pre-screener, we used Twilio to programmatically send and receive text message.

Here is a link to Twilio's documentation - https://www.twilio.com/docs/

Here are some clips from the mRelief Twilio Controller that shows how we decided to structure our code.

```ruby
class TwilioController < ApplicationController
  def text
    session["counter"] ||= 0

    if params[:Body].strip.downcase == "reset"
      session["counter"] = 0
    end

    if session["counter"] == 0
       message = "Welcome to mRelief! We help you check your eligibility for benefits. For foodstamps, text 'food'.  If you make a mistake, send the message 'reset'."
    end

    if params[:Body].strip.downcase == "food"
       message = "Are you enrolled in a college or institution of higher education? Enter 'yes' or 'no'"
       session["page"] = "snap_college_question"
       session["counter"] = 1
    end

    if session["page"] == "snap_college_question" && session["counter"] == 2
       session["college"] = params[:Body].strip.downcase
      if session["college"] == "no"
        message = "Are you a citizen of the United States? Enter 'yes' or 'no'"
        session["page"] = "snap_citizen_question"
      elsif session["college"] == "yes"
        message = "What is your zipcode?"
        session["page"] = "snap_zipcode_question"
       else
         message = "Oops looks like there is a typo! Please type 'yes' or 'no' to answer this question."
         session["counter"] = 1
      end
    end

    #the rest of our Twilio logic goes here

     twiml = Twilio::TwiML::Response.new do |r|
         r.Message message
     end
      session["counter"] += 1

    end

    include Webhookable
     after_filter :set_header
     skip_before_action :verify_authenticity_token

end
```

After asking, a few questions about age, household size and gross montly income, we do a lookup in our database of eligibility cutoffs to determine the user's eligibility status.

```ruby
def text
  age = session["age"].to_i
  snap_dependent_no = session["dependents"].to_i
  snap_gross_income = session["income"].to_i
   if age <= 59
     snap_eligibility = SnapEligibility.find_by({ :snap_dependent_no => snap_dependent_no })
   else
     snap_eligibility = SnapEligibilitySenior.find_by({ :snap_dependent_no => snap_dependent_no })
   end

  if snap_gross_income < snap_eligibility.snap_gross_income
    message = "You may be in luck! You likely qualify for foodstamps. However make sure you accounted for your parents income, if you are still living in the same household.  To access your food stamps, go to #{@lafcenter.center} at #{@lafcenter.address} #{@lafcenter.city}, #{@lafcenter.zipcode.to_i }, #{@lafcenter.telephone}. "
  else
   message = "Based on your household size and income, you likely do not qualify for food stamps. A food pantry near you is #{@food_pantry.name} - #{@food_pantry.street} #{@food_pantry.city} #{@food_pantry.state}, #{@food_pantry.zip} #{@food_pantry.phone}. To check other programs, text 'menu'."
   end
 end
```

Here is an example of how we store the eligibility cutoffs in our seeds.rb file -

```ruby
s = SnapEligibility.new
s.snap_dependent_no = 1
s.snap_gross_income = 1265
s.save

s = SnapEligibility.new
s.snap_dependent_no = 2
s.snap_gross_income = 1705
s.save

s = SnapEligibility.new
s.snap_dependent_no = 3
s.snap_gross_income = 2144
s.save
```

We found these number on the Illinois Department of Human Services website -
https://www.dhs.state.il.us/page.aspx?item=30357


Here is our pre-screener codebase -
https://github.com/mRelief/mrelief_snap_screener_example


We look forward to seeing your solutions that are most relevant for your state and target population!
