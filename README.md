# mrelief_snap_screeners

On February 20-22nd, mRelief (www.mrelief.com) will be part of a national event in partnership with Code For America to build upon our work as the first Social Services Delivery SMS application for screening eligibility in the US. mRelief is a midwest based web and SMS application led by an all-woman web development team that helps users check their eligibility for public assistance.

We invite users all across the nation to push to this repo their food stamp pre-screeners for different states and target populations.  We also encourage meaningful collaboration with non-technical experts in the field engaged in food policy and advocacy.

The four key files we want each user to push from their state:
1) Code for prescreens (SMS Controller file or web forms)
2) Seeds File of Eligibility Data
3) Policy references to substantiate the questions asked
4) Lists of local food pantries in your state listing name, address and phone number

Our goal is to sustain this repository beyond the Hackathon in the efforts to provide SMS screening nationally.


SMS Pre-Screens
A 2010 report by Frost and Sullivan revealed that nearly everyone (90% of U.S. adults) has access to texting, more than any other communication medium.

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

We found these number on the Illinois Department of Human Services website
https://www.dhs.state.il.us/page.aspx?item=30357


We look forward to seeing your solutions that are most relevant for your state and target population!
